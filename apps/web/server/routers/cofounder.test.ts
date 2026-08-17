import { insertUser } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext, memoryStreamBus } from '../test/context';
import { createClarificationTestModel } from '../test/mock-model';
import { sql } from '../test/harness';

describe('co-founder conversation, score, jobs, and business model cards', () => {
  it('creates a scored first draft, lists 17 sections, and sends conversation turns', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `cof-${randomUUID()}@example.com`,
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

    const desk = await caller.project.getDeskSummary({ projectId: project.id });
    expect(desk.overview.waitingFounderTasks).toBeGreaterThanOrEqual(1);
    expect(desk.overview.proposedResearchJob?.jobKind).toBe('research');
    expect(desk.overview.latestCofounderMessage?.actor).toBe('co_founder');

    const sections = await caller.pack.listBusinessModelSections({ projectId: project.id });
    expect(sections).toHaveLength(17);
    expect(sections.map((item) => item.key)).toContain('problem');

    const score = await caller.score.getCurrent({ projectId: project.id });
    expect(score === null || typeof score.overall === 'number').toBe(true);

    const jobs = await caller.job.list({ projectId: project.id, view: 'kanban' });
    expect(jobs.some((job) => job.jobKind === 'research')).toBe(true);

    const sent = await caller.conversation.send({
      projectId: project.id,
      text: 'Owners lose two hours closing the books.',
      idempotencyKey: randomUUID(),
    });
    expect(sent.text).toContain('painful job');
    expect(
      memoryStreamBus(ctx).entries.some(
        (entry) => entry.event.type === 'conversation_message_appended',
      ),
    ).toBe(true);

    const listed = await caller.conversation.list({ projectId: project.id, limit: 20 });
    expect(listed.items.some((item) => item.actor === 'founder')).toBe(true);

    const tasks = await caller.founderTask.list({ projectId: project.id });
    expect(tasks.length).toBeGreaterThan(0);
    await expect(
      caller.founderTask.complete({
        projectId: project.id,
        founderTaskId: tasks[0]!.id,
        evidenceRef: { kind: 'evidence', id: randomUUID() },
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({ cause: { code: 'missing_evidence' } });

    const replayKey = randomUUID();
    const firstSend = await caller.conversation.send({
      projectId: project.id,
      text: 'We are bootstrapped in Pune and prefer concise updates.',
      idempotencyKey: replayKey,
    });
    const replayedSend = await caller.conversation.send({
      projectId: project.id,
      text: 'We are bootstrapped in Pune and prefer concise updates.',
      idempotencyKey: replayKey,
    });
    expect(replayedSend.founderMessage.id).toBe(firstSend.founderMessage.id);

    const preferences = await caller.conversation.listPreferences({ projectId: project.id });
    const geography = preferences.find((item) => item.key === 'geography');
    expect(geography?.value).toBeTruthy();
    if (geography === undefined) {
      throw new Error('expected an inferred geography preference');
    }
    const confirmed = await caller.conversation.confirmPreference({
      projectId: project.id,
      preferenceId: geography.id,
      idempotencyKey: randomUUID(),
    });
    expect(confirmed.founderConfirmed).toBe(true);
    const corrected = await caller.conversation.correctPreference({
      projectId: project.id,
      preferenceId: geography.id,
      value: 'Mumbai',
      idempotencyKey: randomUUID(),
    });
    expect(corrected.value).toBe('Mumbai');
    const summary = await caller.conversation.getSummary({ projectId: project.id });
    expect(summary === null || typeof summary.summaryText === 'string').toBe(true);
  });
});
