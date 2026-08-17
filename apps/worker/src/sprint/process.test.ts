import { randomUUID } from 'node:crypto';

import {
  buildSprintContract,
  createMemoryStreamBus,
  createSecretBox,
} from '@foundry/agent-runtime';
import {
  getSprintById,
  insertInterview,
  insertPackRevision,
  insertProject,
  insertSprint,
  insertUser,
  insertWorkspace,
  listSprintProgressEvents,
  updateProjectCurrentPackRevision,
} from '@foundry/db';
import { SprintIdSchema } from '@foundry/domain';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { afterAll, describe, expect, it } from 'vitest';

import { startSprintWorker } from '../queues/sprint.worker.js';
import { processSprintJob } from './process.js';
import { sql } from '../test/harness.js';

const secretBox = createSecretBox('0'.repeat(64));
const secrets = {};

async function seedSprint(options: { friendInterview?: boolean } = {}) {
  const owner = await insertUser(sql, {
    name: 'Owner',
    email: `sprint-${randomUUID()}@example.com`,
  });
  const workspace = await insertWorkspace(sql, {
    name: 'Acme',
    ownerUserId: owner.id,
  });
  const project = await insertProject(sql, {
    workspaceId: workspace.id,
    name: 'Venture',
  });
  const pack = await insertPackRevision(sql, {
    projectId: project.id,
    revisionNumber: 1,
    actorType: 'founder',
    actorId: owner.id,
    proposedChanges: { clarifications: [] },
  });
  await updateProjectCurrentPackRevision(sql, project.id, pack.id);
  if (options.friendInterview === true) {
    await insertInterview(sql, {
      projectId: project.id,
      participantType: 'friend',
      consent: { given: true, simulated: true },
    });
  }
  const sprintId = SprintIdSchema.parse(randomUUID());
  const sprint = await insertSprint(sql, {
    id: sprintId,
    projectId: project.id,
    status: 'contracted',
    contract: buildSprintContract({
      sprintId,
      packRevisionId: pack.id,
      phase: project.currentPhase,
      objective: 'Diagnose the problem and collect Gate A evidence.',
    }),
  });
  return {
    workspace,
    project,
    pack,
    sprint,
    job: {
      sprintId: sprint.id,
      projectId: project.id,
      workspaceId: workspace.id,
      packRevisionId: pack.id,
      correlationId: randomUUID(),
      attempt: 0,
    },
  };
}

describe('sprint processor', () => {
  it('runs mock worker synthesis and does not pass Gate A without real interviews', async () => {
    const seeded = await seedSprint();
    const bus = createMemoryStreamBus();
    const outcome = await processSprintJob(seeded.job, { sql, streamBus: bus, secretBox, secrets });
    expect(outcome.gateA.result).toBe('failed');
    expect(outcome.critique.recommendation).toBe('PIVOT');
    const sprint = await getSprintById(sql, seeded.sprint.id);
    expect(sprint?.status).toBe('closed');
    expect(await listSprintProgressEvents(sql, seeded.sprint.id)).not.toHaveLength(0);
  });

  it('kills a sprint that only has friend or simulated interviews', async () => {
    const seeded = await seedSprint({ friendInterview: true });
    const outcome = await processSprintJob(seeded.job, {
      sql,
      streamBus: createMemoryStreamBus(),
      secretBox,
      secrets,
    });
    expect(outcome.critique.recommendation).toBe('KILL');
    expect(outcome.gateA.result).toBe('failed');
    const sprint = await getSprintById(sql, seeded.sprint.id);
    expect(sprint?.status).toBe('closed');
  });
});

describe('sprint BullMQ worker', () => {
  const redisUrl = 'redis://localhost:6379';
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

  afterAll(async () => {
    await connection.quit();
  });

  it('consumes a sprint job end to end', async () => {
    const seeded = await seedSprint({ friendInterview: true });
    const queueName = `sprint-test-${randomUUID()}`;
    const queue = new Queue(queueName, { connection });
    const worker = startSprintWorker({
      sql,
      connection,
      streamBus: createMemoryStreamBus(),
      secretBox,
      secrets,
      queueName,
    });

    try {
      await queue.add('run', seeded.job, {
        jobId: `sprint-${seeded.sprint.id}`,
        attempts: 1,
      });

      await expect
        .poll(async () => (await getSprintById(sql, seeded.sprint.id))?.status, {
          timeout: 15_000,
          interval: 100,
        })
        .toBe('closed');
    } finally {
      await worker.close();
      await queue.obliterate({ force: true });
      await queue.close();
    }
  });
});
