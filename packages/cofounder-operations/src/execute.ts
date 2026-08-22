import type { CofounderRuntimeResult } from '@foundry/agent-runtime';
import type { CofounderTurn } from '@foundry/api-contracts';
import {
  isCancelableCofounderOperationState,
  isTerminalCofounderOperationState,
  toCofounderTurnBlock,
  ConversationReferenceSchema,
  type CofounderOperation,
  type CofounderOperationId,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';

import type { CofounderOperationPorts, ExecuteCofounderOperationInput } from './ports.js';
import { parseOperationRecovery, replayedTurn } from './recovery.js';

function canceledError(): AppError {
  return new AppError({
    code: 'workflow_paused',
    explanation: 'The co-founder turn was canceled.',
    nextAction: 'Retry when you want to continue. Accepted record state is unchanged.',
  });
}

export function inProgressTurn(
  operation: CofounderOperation,
  input: { founderRequest?: string; stepId?: string | null },
): CofounderTurn {
  return {
    explanation:
      'The co-founder is working. Accepted record state stays unchanged until you review a proposal.',
    interactionType: 'inform',
    references: [],
    uncertainty: 'This turn is still running.',
    blockedConditions: [],
    activity: 'Queued or running. No accepted record write has occurred.',
    proposalId: null,
    stepId: input.stepId ?? null,
    operation,
  };
}

export async function executeCofounderOperation(
  ports: CofounderOperationPorts,
  input: ExecuteCofounderOperationInput,
): Promise<CofounderTurn> {
  const loaded = await ports.operations.getById(input.operationId);
  if (loaded === null) {
    throw new AppError({
      code: 'not_found',
      explanation: 'That co-founder operation was not found.',
      nextAction: 'Refresh the co-founder view.',
    });
  }
  if (isTerminalCofounderOperationState(loaded.state) || loaded.state === 'awaiting_founder') {
    if (loaded.state === 'canceled' || loaded.state === 'timed_out') {
      throw canceledError();
    }
    if (loaded.state === 'failed') {
      throw new AppError({
        code: 'workflow_failed',
        explanation: 'The original co-founder turn failed. Accepted record state is unchanged.',
        nextAction: 'Send a new message to retry.',
      });
    }
    return replayedTurn(loaded) ?? inProgressTurn(loaded, { stepId: input.stepId ?? null });
  }

  let operation = loaded;
  if (operation.state === 'queued') {
    const claimed = await ports.operations.claimQueued(operation.id);
    if (claimed === null) {
      const latest = await ports.operations.getById(operation.id);
      if (latest === null) {
        throw new AppError({
          code: 'not_found',
          explanation: 'That co-founder operation was not found.',
          nextAction: 'Refresh the co-founder view.',
        });
      }
      if (isTerminalCofounderOperationState(latest.state) || latest.state === 'awaiting_founder') {
        return executeCofounderOperation(ports, input);
      }
      return inProgressTurn(latest, { stepId: input.stepId ?? null });
    }
    operation = claimed;
  }

  const abort = new AbortController();
  const unsubscribe = ports.cancel.subscribe(operation.id, () => abort.abort());
  const recovery = parseOperationRecovery(operation.recovery);
  await ports.operations.updateState(operation.id, {
    state: 'running',
    recovery: {
      ...recovery,
      attempt: (recovery.attempt ?? 0) + 1,
      executor: input.executor,
      claimedAt: new Date().toISOString(),
    },
  });
  await ports.events.publish({
    type: 'cofounder_started',
    operationId: operation.id,
    projectId: operation.projectId,
  });

  try {
    if (abort.signal.aborted || (await ports.cancel.isSignaled(operation.id))) {
      throw canceledError();
    }
    const packet = await ports.context.buildPacket(input.correlationId);
    await ports.capabilities.invoke({
      name: 'venture.readCurrentState',
      input: {
        currentStage: packet.currentStage,
        currentObjective: packet.currentObjective,
      },
      operationId: operation.id,
    });
    if (abort.signal.aborted || (await ports.cancel.isSignaled(operation.id))) {
      throw canceledError();
    }
    const result = await ports.runtime.run({
      operationId: operation.id,
      actor: packet.actor,
      contextPacket: packet,
      founderRequest: input.founderRequest,
      schemaVersion: 'v4.5',
      capabilityManifest: packet.allowedCapabilities,
      timeoutMs: input.timeoutMs,
      abortSignal: abort.signal,
      capabilities: ports.capabilities,
    });
    if (abort.signal.aborted || (await ports.cancel.isSignaled(operation.id))) {
      throw canceledError();
    }
    const proposalId = await persistProposalDraft(ports, operation, result);
    const current = await ports.operations.getById(operation.id);
    if (current?.state === 'canceled' || abort.signal.aborted) {
      throw canceledError();
    }
    const terminalState = proposalId === null ? 'completed' : 'awaiting_founder';
    const turn: CofounderTurn = {
      explanation: result.explanation,
      interactionType: result.interactionType,
      references: result.references,
      uncertainty: result.uncertainty,
      blockedConditions: result.blockedConditions,
      activity: result.activity,
      proposalId,
      stepId: input.stepId ?? null,
      operation: current,
    };
    const cofounderMessage = await ports.messages.insert({
      actor: 'co_founder',
      text: result.explanation,
      blocks: [
        toCofounderTurnBlock({
          interactionType: result.interactionType,
          explanation: result.explanation,
          uncertainty: result.uncertainty,
          blockedConditions: result.blockedConditions,
          activity: result.activity,
          proposalId,
          stepId: input.stepId ?? null,
          operationId: operation.id,
          references: result.references,
          operationState: terminalState,
        }),
      ],
      references: result.references.flatMap((ref) => {
        const parsed = ConversationReferenceSchema.safeParse(ref);
        return parsed.success ? [parsed.data] : [];
      }),
    });
    await ports.events.publish({
      type: 'conversation_message_appended',
      messageId: cofounderMessage.id,
      actor: 'co_founder',
    });
    const storedTurn = { ...turn, operation: null };
    const completed = await ports.operations.updateState(operation.id, {
      state: terminalState,
      recovery: {
        ...recovery,
        turn: storedTurn,
        cofounderMessageId: cofounderMessage.id,
        proposalId,
        executor: input.executor,
      },
    });
    if (terminalState === 'awaiting_founder') {
      await ports.events.publish({
        type: 'cofounder_waiting',
        operationId: operation.id,
        projectId: operation.projectId,
      });
    } else {
      await ports.events.publish({
        type: 'cofounder_completed',
        operationId: operation.id,
        projectId: operation.projectId,
      });
    }
    return { ...turn, operation: completed };
  } catch (error) {
    const paused = error instanceof AppError && error.code === 'workflow_paused';
    if (isCancelableCofounderOperationState(operation.state) || operation.state === 'running') {
      await ports.operations.updateState(operation.id, {
        state: paused ? 'canceled' : 'failed',
        recovery: { ...recovery, category: paused ? 'canceled' : 'runtime_error' },
        ...(paused ? { canceledAt: new Date() } : {}),
      });
    }
    await ports.events.publish(
      paused
        ? {
            type: 'cofounder_canceled',
            operationId: operation.id,
            projectId: operation.projectId,
          }
        : {
            type: 'cofounder_failed',
            operationId: operation.id,
            projectId: operation.projectId,
            category: 'runtime_error',
          },
    );
    throw error;
  } finally {
    unsubscribe();
  }
}

async function persistProposalDraft(
  ports: CofounderOperationPorts,
  operation: CofounderOperation,
  result: CofounderRuntimeResult,
): Promise<string | null> {
  if (result.proposalDraft === undefined || result.proposalDraft.changes.length === 0) {
    return null;
  }
  const created = await ports.capabilities.invoke({
    name: 'proposal.createDraft',
    input: {
      projectId: operation.projectId,
      rationale: result.proposalDraft.rationale,
      interactionType: result.interactionType,
      changes: result.proposalDraft.changes.map((change) => ({
        section: change.section,
        afterPayload: change.afterPayload,
        evidenceRefs: [],
        ...(change.itemKey === undefined ? {} : { itemKey: change.itemKey }),
        ...(change.rationale === undefined ? {} : { rationale: change.rationale }),
      })),
      idempotencyKey: proposalIdempotencyKey(operation.id),
      ...(result.proposalDraft.uncertainty === undefined
        ? {}
        : { uncertainty: result.proposalDraft.uncertainty }),
    },
    operationId: operation.id,
  });
  await ports.events.publish({
    type: 'capability_completed',
    operationId: operation.id,
    capabilityName: 'proposal.createDraft',
  });
  const proposalId = typeof created.data?.proposalId === 'string' ? created.data.proposalId : null;
  if (proposalId !== null) {
    await ports.events.publish({
      type: 'proposal_ready_v4',
      operationId: operation.id,
      proposalId,
    });
  }
  return created.ok ? proposalId : null;
}

export function proposalIdempotencyKey(operationId: CofounderOperationId): string {
  return operationId;
}
