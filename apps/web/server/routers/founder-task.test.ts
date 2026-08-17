import { insertFounderTask, insertUser, withWorkspaceScope } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext } from '../test/context';
import { createClarificationTestModel } from '../test/mock-model';
import { sql } from '../test/harness';

async function createProject() {
  const user = await insertUser(sql, {
    name: 'Founder',
    email: `task-${randomUUID()}@example.com`,
  });
  const languageModel = createClarificationTestModel('What is the painful job to be done?');
  const workspace = await appRouter
    .createCaller(await createTestContext(sql, user))
    .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
  const ctx = await createTestContext(sql, user, { languageModel });
  const caller = appRouter.createCaller(ctx);
  const project = await caller.project.create({
    workspaceId: workspace.id,
    name: 'Cafe books',
    geography: 'India',
    idempotencyKey: randomUUID(),
  });
  return { caller, project };
}

describe('founderTask procedures', () => {
  it('rejects completion without real evidence and accepts Interview, WtpEvent, and EvidenceItem refs', async () => {
    const { caller, project } = await createProject();
    const tasks = await caller.founderTask.list({ projectId: project.id });
    expect(tasks.length).toBeGreaterThan(0);
    const first = tasks[0];
    if (first === undefined) {
      throw new Error('expected a founder task');
    }
    const fetched = await caller.founderTask.get({
      projectId: project.id,
      founderTaskId: first.id,
    });
    expect(fetched.id).toBe(first.id);

    await expect(
      caller.founderTask.complete({
        projectId: project.id,
        founderTaskId: first.id,
        evidenceRef: { kind: 'evidence', id: randomUUID() },
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({ cause: { code: 'missing_evidence' } });

    const interview = await caller.evidence.addInterview({
      projectId: project.id,
      participantType: 'non_friend',
      consent: { given: true },
      quotes: ['We waste hours reconciling invoices.'],
      idempotencyKey: randomUUID(),
    });
    const completeKey = randomUUID();
    const completed = await caller.founderTask.complete({
      projectId: project.id,
      founderTaskId: first.id,
      evidenceRef: { kind: 'evidence', id: interview.interview.id },
      idempotencyKey: completeKey,
    });
    expect(completed.status).toBe('completed');
    const replayed = await caller.founderTask.complete({
      projectId: project.id,
      founderTaskId: first.id,
      evidenceRef: { kind: 'evidence', id: interview.interview.id },
      idempotencyKey: completeKey,
    });
    expect(replayed.id).toBe(completed.id);

    const second = await withWorkspaceScope(sql, [project.workspaceId], async (tx) =>
      insertFounderTask(tx, {
        projectId: project.id,
        title: 'Record a field observation',
        explanation: 'Capture an evidence item from the floor.',
      }),
    );
    const observation = await caller.evidence.recordObservation({
      projectId: project.id,
      summary: 'Owners mentioned weekend staffing pain.',
      idempotencyKey: randomUUID(),
    });
    const byItem = await caller.founderTask.complete({
      projectId: project.id,
      founderTaskId: second.id,
      evidenceRef: { kind: 'evidence', id: observation.id },
      idempotencyKey: randomUUID(),
    });
    expect(byItem.status).toBe('completed');

    const leftover = await withWorkspaceScope(sql, [project.workspaceId], async (tx) =>
      insertFounderTask(tx, {
        projectId: project.id,
        title: 'Collect a paid signal',
        explanation: 'Record an independent willingness-to-pay event.',
      }),
    );
    const wtp = await caller.wtp.record({
      projectId: project.id,
      participantClass: 'independent_prospect',
      instrument: 'paid_pilot',
      amount: '5000',
      currency: 'INR',
      idempotencyKey: randomUUID(),
    });
    const byWtp = await caller.founderTask.complete({
      projectId: project.id,
      founderTaskId: leftover.id,
      evidenceRef: { kind: 'evidence', id: wtp.id },
      idempotencyKey: randomUUID(),
    });
    expect(byWtp.status).toBe('completed');
  });

  it('requests help and requires a reason to defer or skip', async () => {
    const { caller, project } = await createProject();
    const tasks = await caller.founderTask.list({ projectId: project.id });
    const task = tasks[0];
    if (task === undefined) {
      throw new Error('expected a founder task');
    }
    const helped = await caller.founderTask.requestHelp({
      projectId: project.id,
      founderTaskId: task.id,
      idempotencyKey: randomUUID(),
    });
    expect(helped.preparation.helpMessageId).toBeTruthy();

    const extra = await withWorkspaceScope(sql, [project.workspaceId], async (tx) =>
      insertFounderTask(tx, {
        projectId: project.id,
        title: 'Skip or defer this later',
        explanation: 'Used for defer/skip coverage.',
      }),
    );
    const deferred = await caller.founderTask.defer({
      projectId: project.id,
      founderTaskId: extra.id,
      reason: 'Waiting on a cafe visit this weekend.',
      idempotencyKey: randomUUID(),
    });
    expect(deferred.status).toBe('deferred');

    const skipTarget = await withWorkspaceScope(sql, [project.workspaceId], async (tx) =>
      insertFounderTask(tx, {
        projectId: project.id,
        title: 'Out of scope interview',
        explanation: 'Used for skip coverage.',
      }),
    );
    const skipped = await caller.founderTask.skip({
      projectId: project.id,
      founderTaskId: skipTarget.id,
      reason: 'Out of scope for this beachhead.',
      idempotencyKey: randomUUID(),
    });
    expect(skipped.status).toBe('skipped');
  });
});
