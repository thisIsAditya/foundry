import { type CofounderRuntime, type StreamBus } from '@foundry/agent-runtime';
import type { CofounderRespondInput, CofounderTurn, StreamEvent } from '@foundry/api-contracts';
import {
  cofounderCancelKey,
  executeCofounderOperation,
  inProgressTurn,
  parseOperationRecovery,
  replayedTurn,
  type CofounderOperationPorts,
} from '@foundry/cofounder-operations';
import {
  cancelActiveCofounderOperation,
  claimQueuedCofounderOperation,
  getCofounderOperationById,
  getCofounderOperationByIdempotency,
  getConversationMessageById,
  insertCofounderOperation,
  insertConversationMessage,
  updateCofounderOperationState,
  withWorkspaceScope,
  type PoolSql,
  type TransactionSql,
} from '@foundry/db';
import {
  ConversationMessageIdSchema,
  isTerminalCofounderOperationState,
  type CofounderOperation,
  type CofounderOperationId,
  type Project,
  type UserId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';

import type { CoordinationStore } from '../coordination';
import type { JobQueue } from '../queue/job-queue';
import type { CapabilityGateway } from './capability-gateway';
import { ContextService } from './context-service';

const inFlightAborts = new Map<string, AbortController>();
const cancelListeners = new Map<string, Set<() => void>>();

function canceledError(): AppError {
  return new AppError({
    code: 'workflow_paused',
    explanation: 'The co-founder turn was canceled.',
    nextAction: 'Retry when you want to continue. Accepted record state is unchanged.',
  });
}

export class CofounderService {
  constructor(
    private readonly sql: PoolSql,
    private readonly policyService: PolicyService,
    private readonly context: ContextService,
    private readonly gateway: CapabilityGateway,
    private readonly streamBus: StreamBus,
    private readonly runtime: CofounderRuntime,
    private readonly coordination: CoordinationStore,
    private readonly jobQueue: JobQueue,
    private readonly workerEnabled: boolean,
  ) {}

  async respond(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: CofounderRespondInput,
    correlationId: string,
    options?: { waitForResult?: boolean },
  ): Promise<CofounderTurn> {
    if (!this.policyService.can(actor.membership, 'cofounder.respond')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot talk to the co-founder.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const persisted = await withWorkspaceScope(
      this.sql,
      [actor.project.workspaceId],
      async (tx) => {
        const existing = await getCofounderOperationByIdempotency(
          tx,
          actor.project.id,
          input.idempotencyKey,
        );
        if (existing !== null) {
          return { operation: existing, inserted: false };
        }
        const created = await insertCofounderOperation(tx, {
          projectId: actor.project.id,
          workspaceId: actor.project.workspaceId,
          actorUserId: actor.userId,
          inputRef: { text: input.text, stepId: input.stepId ?? null },
          timeoutMs: 20_000,
          idempotencyKey: input.idempotencyKey,
          correlationId,
          state: 'queued',
        });
        const founderMessage = await insertConversationMessage(tx, {
          projectId: actor.project.id,
          actor: 'founder',
          actorUserId: actor.userId,
          text: input.text,
          blocks: [{ kind: 'concise_answer', text: input.text }],
          references: [{ kind: 'operation', id: created.id }],
        });
        return {
          operation: await updateCofounderOperationState(tx, created.id, {
            state: 'queued',
            recovery: { founderMessageId: founderMessage.id },
          }),
          inserted: true,
        };
      },
    );
    const operation = persisted.operation;
    const recovery = parseOperationRecovery(operation.recovery);
    if (persisted.inserted && recovery.founderMessageId !== undefined) {
      await this.streamBus.publish(actor.project.id, {
        type: 'conversation_message_appended',
        messageId: recovery.founderMessageId,
        actor: 'founder',
      });
    }

    if (
      isTerminalCofounderOperationState(operation.state) ||
      operation.state === 'awaiting_founder'
    ) {
      return this.replayTerminal(operation, input.stepId);
    }
    if (inFlightAborts.has(operation.id)) {
      throw new AppError({
        code: 'invalid_input',
        explanation: 'This co-founder request is already running.',
        nextAction: 'Wait for the current turn or cancel it.',
      });
    }
    if (this.workerEnabled && operation.state === 'queued' && options?.waitForResult !== true) {
      await this.jobQueue.enqueueCofounder({
        operationId: operation.id,
        projectId: actor.project.id,
        workspaceId: actor.project.workspaceId,
        actorUserId: actor.userId,
        correlationId,
      });
      await this.streamBus.publish(actor.project.id, {
        type: 'cofounder_started',
        operationId: operation.id,
        projectId: actor.project.id,
      });
      return inProgressTurn(operation, { stepId: input.stepId ?? null });
    }

    const abort = new AbortController();
    inFlightAborts.set(operation.id, abort);
    try {
      return await executeCofounderOperation(this.portsFor(actor), {
        operationId: operation.id,
        founderRequest: input.text,
        correlationId,
        executor: 'inline',
        timeoutMs: 20_000,
        ...(input.stepId === undefined ? {} : { stepId: input.stepId }),
      });
    } finally {
      inFlightAborts.delete(operation.id);
    }
  }

  async cancel(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    operationId: CofounderOperationId,
  ): Promise<void> {
    const canceled = await withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const operation = await getCofounderOperationById(tx, operationId);
      if (operation === null || operation.projectId !== actor.project.id) {
        throw new AppError({
          code: 'not_found',
          explanation: 'That co-founder operation was not found.',
          nextAction: 'Refresh the co-founder view.',
        });
      }
      if (
        isTerminalCofounderOperationState(operation.state) &&
        operation.state !== 'awaiting_founder'
      ) {
        return null;
      }
      return (await cancelActiveCofounderOperation(tx, operation.id)) ?? operation;
    });
    if (canceled === null) {
      return;
    }
    await this.coordination.set(cofounderCancelKey(canceled.id), '1', 60 * 60);
    inFlightAborts.get(canceled.id)?.abort();
    for (const listener of cancelListeners.get(canceled.id) ?? []) {
      listener();
    }
    await this.streamBus.publish(actor.project.id, {
      type: 'cofounder_canceled',
      operationId: canceled.id,
      projectId: actor.project.id,
    });
  }

  async loadTurnMessages(
    actor: { project: Project },
    operation: CofounderOperation | null,
  ): Promise<{ founderMessageId: string | null; cofounderMessageId: string | null }> {
    if (operation === null) {
      return { founderMessageId: null, cofounderMessageId: null };
    }
    const recovery = parseOperationRecovery(operation.recovery);
    return {
      founderMessageId: recovery.founderMessageId ?? null,
      cofounderMessageId: recovery.cofounderMessageId ?? null,
    };
  }

  async getMessage(
    actor: { project: Project },
    messageId: string,
  ): Promise<Awaited<ReturnType<typeof getConversationMessageById>>> {
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      getConversationMessageById(tx, ConversationMessageIdSchema.parse(messageId)),
    );
  }

  private replayTerminal(operation: CofounderOperation, stepId: string | undefined): CofounderTurn {
    if (operation.state === 'canceled' || operation.state === 'timed_out') {
      throw canceledError();
    }
    if (operation.state === 'failed') {
      throw new AppError({
        code: 'workflow_failed',
        explanation: 'The original co-founder turn failed. Accepted record state is unchanged.',
        nextAction: 'Send a new message to retry.',
      });
    }
    return (
      replayedTurn(operation) ?? {
        explanation: 'This turn already completed. Accepted record state is unchanged.',
        interactionType: 'inform',
        references: [],
        uncertainty: 'Replayed from the original operation.',
        blockedConditions: [],
        activity: 'Returned the original co-founder result.',
        proposalId: null,
        stepId: stepId ?? null,
        operation,
      }
    );
  }

  private portsFor(actor: {
    userId: UserId;
    membership: WorkspaceMembership;
    project: Project;
  }): CofounderOperationPorts {
    const scope = <T>(work: (tx: TransactionSql) => Promise<T>): Promise<T> =>
      withWorkspaceScope(this.sql, [actor.project.workspaceId], work);

    return {
      operations: {
        getById: (id) => scope((tx) => getCofounderOperationById(tx, id)),
        claimQueued: (id) => scope((tx) => claimQueuedCofounderOperation(tx, id)),
        updateState: (id, patch) => scope((tx) => updateCofounderOperationState(tx, id, patch)),
      },
      messages: {
        insert: (input) =>
          scope((tx) =>
            insertConversationMessage(tx, {
              projectId: actor.project.id,
              actor: input.actor,
              text: input.text,
              blocks: input.blocks,
              ...(input.references === undefined ? {} : { references: input.references }),
            }),
          ),
        getById: (id) => scope((tx) => getConversationMessageById(tx, id)),
      },
      context: {
        buildPacket: (correlationId) => this.context.buildPacket({ ...actor, correlationId }),
      },
      runtime: this.runtime,
      capabilities: {
        invoke: (request) =>
          this.gateway.invoke(
            { ...actor, operationId: request.operationId as CofounderOperationId },
            request.name,
            request.input,
          ),
      },
      events: {
        publish: async (event: StreamEvent) => {
          await this.streamBus.publish(actor.project.id, event);
        },
      },
      cancel: {
        subscribe: (operationId, onCancel) => {
          const set = cancelListeners.get(operationId) ?? new Set();
          set.add(onCancel);
          cancelListeners.set(operationId, set);
          const local = inFlightAborts.get(operationId);
          if (local !== undefined) {
            local.signal.addEventListener('abort', onCancel);
          }
          let stopped = false;
          const poll = async (): Promise<void> => {
            while (!stopped) {
              const signaled = await this.coordination.get(cofounderCancelKey(operationId));
              if (signaled === '1') {
                onCancel();
                return;
              }
              await new Promise((resolve) => setTimeout(resolve, 400));
            }
          };
          void poll();
          return () => {
            stopped = true;
            set.delete(onCancel);
            local?.signal.removeEventListener('abort', onCancel);
          };
        },
        isSignaled: async (operationId) => {
          if (inFlightAborts.get(operationId)?.signal.aborted === true) {
            return true;
          }
          return (await this.coordination.get(cofounderCancelKey(operationId))) === '1';
        },
      },
    };
  }
}
