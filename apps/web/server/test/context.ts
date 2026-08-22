import { createMemoryStreamBus, type CofounderRuntime } from '@foundry/agent-runtime';
import { listWorkspaceMembershipsByUserId, type PoolSql } from '@foundry/db';
import type { User } from '@foundry/domain';
import { PolicyService } from '@foundry/policy';
import { randomUUID } from 'node:crypto';

import { createMemoryCoordinationStore } from '../coordination';
import { createServices, type Context, type ServiceExtras } from '../context';
import { createMemoryJobQueue, type MemoryJobQueue } from '../queue/job-queue';
import { createMemoryObjectStore } from '../storage/object-store';

const testRuntime: CofounderRuntime = {
  async run(input) {
    return {
      explanation: `We are in ${input.contextPacket.currentStage}: ${input.contextPacket.currentObjective}`,
      interactionType: 'ask',
      references: [],
      facts: [],
      interpretation: '',
      assumptions: [],
      uncertainty: 'This deterministic test runtime does not write business state.',
      blockedConditions: [],
      activity: 'Asked one clarifying question. Accepted record state is unchanged.',
    };
  },
};

export function memoryJobQueue(ctx: Context): MemoryJobQueue {
  if (!('cofounderJobs' in ctx.jobQueue)) {
    throw new Error('test context expected a memory job queue');
  }
  return ctx.jobQueue as MemoryJobQueue;
}

export function memoryStreamBus(ctx: Context): ReturnType<typeof createMemoryStreamBus> {
  if (!('entries' in ctx.streamBus)) {
    throw new Error('test context expected a memory stream bus');
  }
  return ctx.streamBus as ReturnType<typeof createMemoryStreamBus>;
}

export async function createTestContext(
  sql: PoolSql,
  user: User | null,
  overrides: Partial<ServiceExtras> = {},
): Promise<Context> {
  const coordination = createMemoryCoordinationStore();
  const extras: ServiceExtras = {
    objectStore: createMemoryObjectStore(),
    jobQueue: createMemoryJobQueue(),
    streamBus: createMemoryStreamBus(),
    cofounderRuntime: testRuntime,
    ...overrides,
  };
  const services = createServices(sql, coordination, new PolicyService(), extras);
  if (user === null) {
    return {
      sql,
      actor: { type: 'anonymous' },
      session: null,
      correlationId: randomUUID(),
      coordination,
      services,
      clientIp: '127.0.0.1',
      objectStore: extras.objectStore,
      jobQueue: extras.jobQueue,
      streamBus: extras.streamBus,
    };
  }
  const memberships = await listWorkspaceMembershipsByUserId(sql, user.id);
  return {
    sql,
    actor: { type: 'user', userId: user.id, memberships },
    session: { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
    correlationId: randomUUID(),
    coordination,
    services,
    clientIp: '127.0.0.1',
    objectStore: extras.objectStore,
    jobQueue: extras.jobQueue,
    streamBus: extras.streamBus,
  };
}
