import { DeepSeekHarnessRuntime, type StreamBus } from '@foundry/agent-runtime';
import { CreateProposalInputSchema, type CreateProposalInput } from '@foundry/api-contracts';
import {
  CofounderJobDataSchema,
  cofounderCancelKey,
  executeCofounderOperation,
  type CofounderJobData,
  type CofounderOperationPorts,
} from '@foundry/cofounder-operations';
import {
  claimQueuedCofounderOperation,
  getCommandReceipt,
  getCofounderOperationById,
  getConversationMessageById,
  getJourneyByProjectId,
  getProjectById,
  getRecordItemBySection,
  insertCommandReceipt,
  insertConversationMessage,
  insertProposalChangeV4,
  insertProposalV4,
  listRecordItemsByProjectId,
  listWorkspaceMembershipsByUserId,
  updateCofounderOperationState,
  withWorkspaceScope,
  type PoolSql,
  type TransactionSql,
} from '@foundry/db';
import {
  RECORD_SECTION_DEFINITIONS,
  type CofounderOperationId,
  type Project,
  type UserId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import type { Redis } from 'ioredis';

export async function processCofounderJob(
  data: CofounderJobData,
  deps: {
    sql: PoolSql;
    streamBus: StreamBus;
    redis: Redis;
    harness: { endpoint: string; token: string };
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
      harness: deps.harness,
      actor: { userId: job.actorUserId, membership, project },
    }),
    {
      operationId: job.operationId,
      founderRequest,
      correlationId: job.correlationId,
      executor: 'worker',
      timeoutMs: operation?.timeoutMs ?? 20_000,
      ...(stepId === undefined ? {} : { stepId }),
    },
  );
}

function portsFor(input: {
  sql: PoolSql;
  streamBus: StreamBus;
  redis: Redis;
  harness: { endpoint: string; token: string };
  actor: { userId: UserId; membership: WorkspaceMembership; project: Project };
}): CofounderOperationPorts {
  const { sql, streamBus, redis, harness, actor } = input;
  const scope = <T>(work: (tx: TransactionSql) => Promise<T>): Promise<T> =>
    withWorkspaceScope(sql, [actor.project.workspaceId], work);
  const runtime = new DeepSeekHarnessRuntime(harness);
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
      async buildPacket(correlationId) {
        return withWorkspaceScope(sql, [actor.project.workspaceId], async (tx) => {
          const journey = await getJourneyByProjectId(tx, actor.project.id);
          const items = await listRecordItemsByProjectId(tx, actor.project.id);
          return {
            actor: {
              workspaceId: actor.project.workspaceId,
              ventureId: actor.project.id,
              userId: actor.userId,
            },
            currentStage: journey?.currentStage ?? 'idea',
            currentObjective: journey?.currentObjective ?? 'Capture the idea.',
            acceptedRecord: items.map((item) => ({
              section: item.section,
              status: item.status,
              provenance: item.provenance,
              summary: item.content.summary,
            })),
            pendingProposals: [],
            activeSteps: [],
            readiness: [],
            recentMessages: [],
            omitted: ['full_transcript', 'raw_documents', 'hidden_reasoning'],
            correlationId,
            allowedCapabilities: ['venture.readCurrentState', 'proposal.createDraft'],
          };
        });
      },
    },
    runtime,
    capabilities: {
      async invoke(request) {
        if (request.name === 'venture.readCurrentState') {
          return {
            ok: true,
            summary: 'Current venture state was read.',
            data: { projectId: actor.project.id },
          };
        }
        if (request.name === 'proposal.createDraft') {
          const parsed = CreateProposalInputSchema.safeParse({
            ...(typeof request.input === 'object' && request.input !== null ? request.input : {}),
            projectId: actor.project.id,
          });
          if (!parsed.success) {
            return {
              ok: false,
              summary: 'Proposal draft input was invalid. Accepted record state is unchanged.',
            };
          }
          const proposalId = await createProposalDraft(scope, actor, parsed.data);
          return {
            ok: true,
            summary: 'Created a reviewable proposal. It is not accepted.',
            data: { proposalId },
          };
        }
        return {
          ok: false,
          summary:
            'This worker capability is draft-only and not yet bound. Accepted record state is unchanged.',
        };
      },
    },
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

async function createProposalDraft(
  scope: <T>(work: (tx: TransactionSql) => Promise<T>) => Promise<T>,
  actor: { userId: UserId; project: Project },
  input: CreateProposalInput,
): Promise<string> {
  return scope(async (tx) => {
    const existing = await getCommandReceipt(
      tx,
      actor.userId,
      'proposal.create',
      input.idempotencyKey,
    );
    if (
      existing !== null &&
      typeof existing === 'object' &&
      existing !== null &&
      'proposal' in existing &&
      typeof existing.proposal === 'object' &&
      existing.proposal !== null &&
      'id' in existing.proposal &&
      typeof existing.proposal.id === 'string'
    ) {
      return existing.proposal.id;
    }
    const proposal = await insertProposalV4(tx, {
      projectId: actor.project.id,
      workspaceId: actor.project.workspaceId,
      authorType: 'cofounder',
      authorId: actor.userId,
      rationale: input.rationale,
      uncertainty: input.uncertainty ?? null,
      interactionType: input.interactionType ?? 'change',
      correlationId: input.idempotencyKey,
    });
    const changes = [];
    for (const draft of input.changes) {
      const record = await getRecordItemBySection(
        tx,
        actor.project.id,
        draft.section,
        draft.itemKey ?? RECORD_SECTION_DEFINITIONS[draft.section].defaultItemKey,
      );
      changes.push(
        await insertProposalChangeV4(tx, {
          proposalId: proposal.id,
          projectId: actor.project.id,
          workspaceId: actor.project.workspaceId,
          recordItemId: record?.id ?? null,
          section: draft.section,
          itemKey: draft.itemKey ?? record?.itemKey ?? null,
          beforePayload: record?.content ?? null,
          afterPayload: draft.afterPayload,
          evidenceRefs: draft.evidenceRefs,
        }),
      );
    }
    await insertCommandReceipt(tx, {
      workspaceId: actor.project.workspaceId,
      projectId: actor.project.id,
      actorId: actor.userId,
      command: 'proposal.create',
      idempotencyKey: input.idempotencyKey,
      result: {
        proposal,
        changes,
        affectedSections: [...new Set(changes.map((change) => change.section))],
      },
    });
    return proposal.id;
  });
}
