import type { CofounderContextPacket } from '@foundry/agent-runtime';
import type { StreamEvent } from '@foundry/api-contracts';
import {
  CofounderOperationIdSchema,
  CofounderOperationSchema,
  ConversationMessageIdSchema,
  ConversationMessageSchema,
  ProjectIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
  type CofounderOperation,
  type ConversationMessage,
} from '@foundry/domain';
import { describe, expect, it } from 'vitest';

import { executeCofounderOperation } from './execute.js';
import type { CofounderOperationPorts } from './ports.js';

const PROJECT_ID = ProjectIdSchema.parse('10000000-0000-4000-8000-000000000001');
const WORKSPACE_ID = WorkspaceIdSchema.parse('10000000-0000-4000-8000-000000000002');
const USER_ID = UserIdSchema.parse('10000000-0000-4000-8000-000000000003');
const OPERATION_ID = CofounderOperationIdSchema.parse('10000000-0000-4000-8000-000000000004');

function packet(): CofounderContextPacket {
  return {
    actor: { workspaceId: WORKSPACE_ID, ventureId: PROJECT_ID, userId: USER_ID },
    currentStage: 'idea',
    currentObjective: 'Capture the idea.',
    acceptedRecord: [],
    pendingProposals: [],
    activeSteps: [],
    readiness: [],
    recentMessages: [],
    omitted: ['full_transcript'],
    correlationId: 'corr',
    allowedCapabilities: ['venture.readCurrentState', 'proposal.createDraft'],
  };
}

function result() {
  return {
    explanation: 'What would most change the next useful step?',
    interactionType: 'ask' as const,
    references: [],
    uncertainty: 'No live model was configured.',
    blockedConditions: [],
    activity: 'Asked one clarifying question. Accepted record state is unchanged.',
  };
}

function seedOperation(state: CofounderOperation['state']): CofounderOperation {
  return CofounderOperationSchema.parse({
    id: OPERATION_ID,
    projectId: PROJECT_ID,
    workspaceId: WORKSPACE_ID,
    actorUserId: USER_ID,
    runtimeKind: 'direct',
    state,
    inputRef: { text: 'Help me name the customer.' },
    timeoutMs: 8_000,
    canceledAt: null,
    idempotencyKey: '10000000-0000-4000-8000-000000000099',
    correlationId: '10000000-0000-4000-8000-000000000098',
    usage: {},
    recovery: {},
    createdAt: new Date('2026-08-22T00:00:00.000Z'),
    updatedAt: new Date('2026-08-22T00:00:00.000Z'),
  });
}

function createMemoryPorts(options?: { cancelSignaled?: boolean; proposalId?: string }): {
  ports: CofounderOperationPorts;
  events: StreamEvent[];
  operations: Map<string, CofounderOperation>;
} {
  const operations = new Map<string, CofounderOperation>([[OPERATION_ID, seedOperation('queued')]]);
  const messages: ConversationMessage[] = [];
  const events: StreamEvent[] = [];
  const listeners = new Set<() => void>();
  const ports: CofounderOperationPorts = {
    operations: {
      async getById(id) {
        return operations.get(id) ?? null;
      },
      async claimQueued(id) {
        const current = operations.get(id);
        if (current === undefined || current.state !== 'queued') {
          return null;
        }
        const claimed = { ...current, state: 'running' as const, updatedAt: new Date() };
        operations.set(id, claimed);
        return claimed;
      },
      async updateState(id, patch) {
        const current = operations.get(id);
        if (current === undefined) {
          throw new Error('missing operation');
        }
        const next = {
          ...current,
          state: patch.state,
          updatedAt: new Date(),
          ...(patch.recovery === undefined ? {} : { recovery: patch.recovery }),
          ...(patch.usage === undefined ? {} : { usage: patch.usage }),
          ...(patch.canceledAt === undefined ? {} : { canceledAt: patch.canceledAt }),
        };
        operations.set(id, next);
        return next;
      },
    },
    messages: {
      async insert(input) {
        const message = ConversationMessageSchema.parse({
          id: ConversationMessageIdSchema.parse(
            `20000000-0000-4000-8000-${String(messages.length + 1).padStart(12, '0')}`,
          ),
          projectId: PROJECT_ID,
          actor: input.actor,
          actorUserId: null,
          text: input.text,
          blocks: input.blocks,
          references: input.references ?? [],
          visibility: 'founder_visible',
          createdAt: new Date(),
        });
        messages.push(message);
        return message;
      },
      async getById(id) {
        return messages.find((item) => item.id === id) ?? null;
      },
    },
    context: {
      async buildPacket() {
        return packet();
      },
    },
    runtime: {
      async run() {
        return result();
      },
    },
    capabilities: {
      async invoke(request) {
        if (request.name === 'proposal.createDraft' && options?.proposalId !== undefined) {
          return {
            ok: true,
            summary: 'Created a reviewable proposal.',
            data: { proposalId: options.proposalId },
          };
        }
        return { ok: true, summary: 'Current stage is idea.', data: { currentStage: 'idea' } };
      },
    },
    events: {
      async publish(event) {
        events.push(event);
      },
    },
    cancel: {
      subscribe(_id, onCancel) {
        listeners.add(onCancel);
        return () => listeners.delete(onCancel);
      },
      async isSignaled() {
        return options?.cancelSignaled === true;
      },
    },
  };
  return { ports, events, operations };
}

describe('executeCofounderOperation', () => {
  it('claims queued work, persists a typed ask, and leaves accepted state unchanged', async () => {
    const { ports, events, operations } = createMemoryPorts();
    const turn = await executeCofounderOperation(ports, {
      operationId: OPERATION_ID,
      founderRequest: 'Help me name the customer.',
      correlationId: 'corr',
      executor: 'inline',
      timeoutMs: 8_000,
    });
    expect(turn.interactionType).toBe('ask');
    expect(turn.proposalId).toBeNull();
    expect(operations.get(OPERATION_ID)?.state).toBe('completed');
    expect(events.some((event) => event.type === 'cofounder_started')).toBe(true);
    expect(events.some((event) => event.type === 'cofounder_completed')).toBe(true);
    expect(events.some((event) => event.type === 'conversation_message_appended')).toBe(true);
    const completed = operations.get(OPERATION_ID);
    const recovery = completed?.recovery as { cofounderMessageId?: string };
    expect(recovery.cofounderMessageId).toBeTruthy();
  });

  it('replays a completed operation without creating another message', async () => {
    const { ports, operations } = createMemoryPorts();
    const first = await executeCofounderOperation(ports, {
      operationId: OPERATION_ID,
      founderRequest: 'Help me name the customer.',
      correlationId: 'corr',
      executor: 'inline',
      timeoutMs: 8_000,
    });
    const replayed = await executeCofounderOperation(ports, {
      operationId: OPERATION_ID,
      founderRequest: 'Help me name the customer.',
      correlationId: 'corr',
      executor: 'inline',
      timeoutMs: 8_000,
    });
    expect(replayed.explanation).toBe(first.explanation);
    expect(operations.get(OPERATION_ID)?.state).toBe('completed');
  });

  it('cancels before runtime and does not create a proposal', async () => {
    const { ports, operations } = createMemoryPorts({ cancelSignaled: true });
    await expect(
      executeCofounderOperation(ports, {
        operationId: OPERATION_ID,
        founderRequest: 'Help me name the customer.',
        correlationId: 'corr',
        executor: 'inline',
        timeoutMs: 8_000,
      }),
    ).rejects.toMatchObject({ code: 'workflow_paused' });
    expect(operations.get(OPERATION_ID)?.state).toBe('canceled');
  });

  it('marks awaiting_founder when a proposal draft is created through the gateway', async () => {
    const proposalId = '30000000-0000-4000-8000-000000000001';
    const { ports, events, operations } = createMemoryPorts({ proposalId });
    ports.runtime = {
      async run() {
        return {
          ...result(),
          interactionType: 'change',
          proposalDraft: {
            rationale: 'Name the customer as independent cafe owners.',
            changes: [
              {
                section: 'beachhead_customer',
                afterPayload: { summary: 'Independent cafe owners.' },
              },
            ],
          },
        };
      },
    };
    const turn = await executeCofounderOperation(ports, {
      operationId: OPERATION_ID,
      founderRequest: 'The customer is independent cafe owners.',
      correlationId: 'corr',
      executor: 'inline',
      timeoutMs: 8_000,
    });
    expect(turn.proposalId).toBe(proposalId);
    expect(operations.get(OPERATION_ID)?.state).toBe('awaiting_founder');
    expect(events.some((event) => event.type === 'proposal_ready_v4')).toBe(true);
    expect(events.some((event) => event.type === 'cofounder_waiting')).toBe(true);
    const replayed = await executeCofounderOperation(ports, {
      operationId: OPERATION_ID,
      founderRequest: 'The customer is independent cafe owners.',
      correlationId: 'corr',
      executor: 'inline',
      timeoutMs: 8_000,
    });
    expect(replayed.proposalId).toBe(proposalId);
    expect(operations.get(OPERATION_ID)?.state).toBe('awaiting_founder');
  });
});
