import { createCofounderRuntime, type StreamBus } from '@foundry/agent-runtime';
import {
  CofounderJobDataSchema,
  CapabilityGateway,
  buildCofounderContextEnvelope,
  cancelCapabilityTokensForOperation,
  cofounderCancelKey,
  executeCofounderOperation,
  issueCapabilityToken,
  persistSuggestedJourneySteps,
  type CofounderJobData,
  type CofounderOperationPorts,
} from '@foundry/cofounder-operations';
import {
  claimQueuedCofounderOperation,
  getCofounderOperationById,
  getConversationMessageById,
  getProjectById,
  insertConversationMessage,
  listWorkspaceMembershipsByUserId,
  updateCofounderOperationState,
  withWorkspaceScope,
  type PoolSql,
  type TransactionSql,
} from '@foundry/db';
import type { CofounderOperationId, Project, UserId, WorkspaceMembership } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import type { Redis } from 'ioredis';

export async function processCofounderJob(
  data: CofounderJobData,
  deps: {
    sql: PoolSql;
    streamBus: StreamBus;
    redis: Redis;
    harness?: { endpoint: string; token: string };
    aiMode?: 'off' | 'direct' | 'harness';
    capabilityInvokeUrl?: string;
    webSearchApiKey?: string;
  },
): Promise<void> {
  const job = CofounderJobDataSchema.parse(data);
  const project = await getProjectById(deps.sql, job.projectId);
  if (project === null || project.workspaceId !== job.workspaceId) {
    throw new AppError({
      code: 'not_found',
      explanation: 'That venture was not found for the co-founder operation.',
      nextAction: 'Retry from the co-founder view.',
    });
  }
  const memberships = await listWorkspaceMembershipsByUserId(deps.sql, job.actorUserId);
  const membership = memberships.find((item) => item.workspaceId === job.workspaceId);
  if (membership === undefined) {
    throw new AppError({
      code: 'policy_forbidden',
      explanation: 'The actor is not a member of this workspace.',
      nextAction: 'Retry as a workspace member.',
    });
  }
  const operation = await withWorkspaceScope(deps.sql, [job.workspaceId], async (tx) =>
    getCofounderOperationById(tx, job.operationId),
  );
  const founderRequest =
    typeof operation?.inputRef === 'object' &&
    operation.inputRef !== null &&
    'text' in operation.inputRef &&
    typeof operation.inputRef.text === 'string'
      ? operation.inputRef.text
      : '';
  const stepId =
    typeof operation?.inputRef === 'object' &&
    operation.inputRef !== null &&
    'stepId' in operation.inputRef &&
    typeof operation.inputRef.stepId === 'string'
      ? operation.inputRef.stepId
      : undefined;
  await executeCofounderOperation(
    portsFor({
      sql: deps.sql,
      streamBus: deps.streamBus,
      redis: deps.redis,
      actor: { userId: job.actorUserId, membership, project },
      ...(deps.harness === undefined ? {} : { harness: deps.harness }),
      ...(deps.aiMode === undefined ? {} : { aiMode: deps.aiMode }),
      ...(deps.capabilityInvokeUrl === undefined
        ? {}
        : { capabilityInvokeUrl: deps.capabilityInvokeUrl }),
      ...(deps.webSearchApiKey === undefined ? {} : { webSearchApiKey: deps.webSearchApiKey }),
    }),
    {
      operationId: job.operationId,
      founderRequest,
      correlationId: job.correlationId,
      executor: 'worker',
      timeoutMs: operation?.timeoutMs ?? 45_000,
      ...(stepId === undefined ? {} : { stepId }),
    },
  );
}

function portsFor(input: {
  sql: PoolSql;
  streamBus: StreamBus;
  redis: Redis;
  harness?: { endpoint: string; token: string };
  aiMode?: 'off' | 'direct' | 'harness';
  capabilityInvokeUrl?: string;
  webSearchApiKey?: string;
  actor: { userId: UserId; membership: WorkspaceMembership; project: Project };
}): CofounderOperationPorts {
  const { sql, streamBus, redis, actor } = input;
  const scope = <T>(work: (tx: TransactionSql) => Promise<T>): Promise<T> =>
    withWorkspaceScope(sql, [actor.project.workspaceId], work);
  const selected = createCofounderRuntime({
    ...(input.aiMode === undefined ? {} : { aiMode: input.aiMode }),
    ...(input.harness === undefined ? {} : { harnessEndpoint: input.harness.endpoint }),
    ...(input.harness === undefined ? {} : { harnessToken: input.harness.token }),
  });
  const gateway = new CapabilityGateway(sql, new PolicyService(), fetch, input.webSearchApiKey);
  return {
    operations: {
      getById: (id) => scope((tx) => getCofounderOperationById(tx, id)),
      claimQueued: (id) => scope((tx) => claimQueuedCofounderOperation(tx, id)),
      updateState: (id, patch) => scope((tx) => updateCofounderOperationState(tx, id, patch)),
    },
    messages: {
      insert: (message) =>
        scope((tx) =>
          insertConversationMessage(tx, {
            projectId: actor.project.id,
            actor: message.actor,
            text: message.text,
            blocks: message.blocks,
            ...(message.references === undefined ? {} : { references: message.references }),
          }),
        ),
      getById: (id) => scope((tx) => getConversationMessageById(tx, id)),
    },
    context: {
      buildPacket: (correlationId) =>
        buildCofounderContextEnvelope(sql, { ...actor, correlationId }),
    },
    runtime: selected.runtime,
    capabilities: {
      invoke: (request) =>
        gateway.invoke(
          { ...actor, operationId: request.operationId as CofounderOperationId },
          request.name,
          request.input,
        ),
    },
    suggestions: {
      persist: ({ steps }) =>
        scope((tx) =>
          persistSuggestedJourneySteps(tx, {
            project: actor.project,
            actorUserId: actor.userId,
            steps,
          }),
        ),
    },
    ...(input.capabilityInvokeUrl === undefined
      ? {}
      : {
          tokens: {
            issue: async ({
              operationId,
              allowedCapabilities,
              maxInvocations,
            }: {
              operationId: CofounderOperationId;
              allowedCapabilities: readonly string[];
              maxInvocations: number;
            }) => {
              const token = await scope((tx) =>
                issueCapabilityToken(tx, {
                  operationId,
                  projectId: actor.project.id,
                  workspaceId: actor.project.workspaceId,
                  actorUserId: actor.userId,
                  allowedCapabilities,
                  maxInvocations,
                }),
              );
              return { token, invokeUrl: input.capabilityInvokeUrl as string };
            },
            cancel: (operationId: CofounderOperationId) =>
              scope((tx) => cancelCapabilityTokensForOperation(tx, operationId)),
          },
        }),
    events: {
      async publish(event) {
        await streamBus.publish(actor.project.id, event);
      },
    },
    cancel: {
      subscribe(_operationId: CofounderOperationId, onCancel) {
        let stopped = false;
        const poll = async (): Promise<void> => {
          while (!stopped) {
            const signaled = await redis.get(cofounderCancelKey(_operationId));
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
        };
      },
      async isSignaled(operationId) {
        return (await redis.get(cofounderCancelKey(operationId))) === '1';
      },
    },
  };
}
