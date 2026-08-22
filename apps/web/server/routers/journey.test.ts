import { insertUser } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext } from '../test/context';
import { sql } from '../test/harness';

describe('founder journey and record', () => {
  it('records the founder idea, then starts at the problem rather than optional context', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `journey-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const caller = appRouter.createCaller(
      await createTestContext(sql, user, { cofounderWorkerEnabled: false }),
    );
    const created = await caller.project.create({
      workspaceId: workspace.id,
      name: 'Cafe books',
      founderPitch: 'Cafe owners lose two hours every night closing the books by hand.',
      idempotencyKey: randomUUID(),
    });

    const overview = await caller.journey.getOverview({ projectId: created.id });
    expect(overview.journey.currentStage).toBe('problem');
    expect(overview.recommendedStep).not.toBeNull();
    expect(overview.recommendedStep?.recommended).toBe(true);
    expect(overview.recommendedStep?.stage).toBe('problem');

    const sections = await caller.record.listSections({ projectId: created.id });
    expect(sections).toHaveLength(12);
    const idea = sections.find((item) => item.section === 'idea_founder_context');
    expect(idea?.item.provenance).toBe('founder_input');
    expect(idea?.item.status).toBe('draft');
    expect(
      sections
        .filter((item) => item.section !== 'idea_founder_context')
        .every((item) => item.item.status === 'empty'),
    ).toBe(true);
    const problem = sections.find((item) => item.section === 'problem');
    if (problem === undefined) {
      throw new Error('expected problem section');
    }
    const started = await caller.journey.startStep({
      projectId: created.id,
      stepId: overview.recommendedStep!.id,
      expectedRevision: overview.recommendedStep!.revision,
      idempotencyKey: randomUUID(),
    });
    expect(started.status).toBe('in_progress');
    await expect(
      caller.journey.submitStep({
        projectId: created.id,
        stepId: started.id,
        expectedRevision: started.revision,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({ cause: { code: 'invalid_input' } });
    await caller.record.saveSection({
      projectId: created.id,
      section: 'problem',
      expectedRevision: problem.item.revision,
      summary: 'Independent cafe owners repeatedly lose two hours closing their books each night.',
      idempotencyKey: randomUUID(),
    });
    const completed = await caller.journey.submitStep({
      projectId: created.id,
      stepId: started.id,
      expectedRevision: started.revision,
      idempotencyKey: randomUUID(),
    });
    expect(completed.status).toBe('complete');
    const afterCompletion = await caller.journey.getOverview({ projectId: created.id });
    expect(afterCompletion.journey.currentStage).toBe('customer');
    expect(afterCompletion.recommendedStep?.stage).toBe('customer');
  });

  it('reviews a proposal per change, versions the record, and marks dependents stale', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `proposal-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const caller = appRouter.createCaller(
      await createTestContext(sql, user, { cofounderWorkerEnabled: false }),
    );
    const created = await caller.project.create({
      workspaceId: workspace.id,
      name: 'Cafe books',
      geography: 'IN',
      founderPitch: 'Cafe owners lose two hours closing the books.',
      idempotencyKey: randomUUID(),
    });

    const problemProposal = await caller.proposal.create({
      projectId: created.id,
      rationale: 'Name the recurring closing-books problem.',
      uncertainty: 'Still founder input, not proof.',
      changes: [
        {
          section: 'problem',
          afterPayload: { summary: 'Nightly closing takes two hours.', fields: {} },
        },
      ],
      idempotencyKey: randomUUID(),
    });
    const acceptedProblem = await caller.proposal.review({
      projectId: created.id,
      proposalId: problemProposal.proposal.id,
      expectedRevision: problemProposal.proposal.revision,
      outcomes: [{ changeId: problemProposal.changes[0]!.id, outcome: 'accept' }],
      idempotencyKey: randomUUID(),
    });
    expect(acceptedProblem.proposal.status).toBe('accepted');

    const customerProposal = await caller.proposal.create({
      projectId: created.id,
      rationale: 'Choose independent cafe owners as the first customer.',
      changes: [
        {
          section: 'beachhead_customer',
          afterPayload: { summary: 'Independent cafe owners in Pune.', fields: {} },
        },
      ],
      idempotencyKey: randomUUID(),
    });
    await caller.proposal.review({
      projectId: created.id,
      proposalId: customerProposal.proposal.id,
      expectedRevision: customerProposal.proposal.revision,
      outcomes: [{ changeId: customerProposal.changes[0]!.id, outcome: 'accept' }],
      idempotencyKey: randomUUID(),
    });

    const revisedProblem = await caller.proposal.create({
      projectId: created.id,
      rationale: 'Narrow the problem to end-of-day cash reconciliation.',
      changes: [
        {
          section: 'problem',
          afterPayload: { summary: 'End-of-day cash reconciliation takes two hours.', fields: {} },
        },
      ],
      idempotencyKey: randomUUID(),
    });
    await caller.proposal.review({
      projectId: created.id,
      proposalId: revisedProblem.proposal.id,
      expectedRevision: revisedProblem.proposal.revision,
      outcomes: [{ changeId: revisedProblem.changes[0]!.id, outcome: 'accept' }],
      idempotencyKey: randomUUID(),
    });

    const customer = await caller.record.getSection({
      projectId: created.id,
      section: 'beachhead_customer',
    });
    expect(customer.item.status).toBe('stale');
    expect(customer.staleReasons.length).toBeGreaterThan(0);

    const keep = await caller.proposal.create({
      projectId: created.id,
      rationale: 'Leave the offer empty.',
      changes: [
        {
          section: 'offer_pricing_model',
          afterPayload: { summary: 'Subscription for closing books.', fields: {} },
        },
      ],
      idempotencyKey: randomUUID(),
    });
    const replayKey = randomUUID();
    const first = await caller.proposal.review({
      projectId: created.id,
      proposalId: keep.proposal.id,
      expectedRevision: keep.proposal.revision,
      outcomes: [{ changeId: keep.changes[0]!.id, outcome: 'keep_current' }],
      idempotencyKey: replayKey,
    });
    const replayed = await caller.proposal.review({
      projectId: created.id,
      proposalId: keep.proposal.id,
      expectedRevision: keep.proposal.revision,
      outcomes: [{ changeId: keep.changes[0]!.id, outcome: 'keep_current' }],
      idempotencyKey: replayKey,
    });
    expect(first.proposal.status).toBe('rejected');
    expect(replayed.proposal.id).toBe(first.proposal.id);
    const offer = await caller.record.getSection({
      projectId: created.id,
      section: 'offer_pricing_model',
    });
    expect(offer.item.status).toBe('empty');
    expect(offer.item.content.summary).toBe('');
  });

  it('lets the co-founder ask without changing accepted state', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `cof4-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const caller = appRouter.createCaller(
      await createTestContext(sql, user, { cofounderWorkerEnabled: false }),
    );
    const created = await caller.project.create({
      workspaceId: workspace.id,
      name: 'Cafe books',
      founderPitch: 'Cafe owners lose two hours closing the books.',
      idempotencyKey: randomUUID(),
    });
    const turn = await caller.cofounder.respond({
      projectId: created.id,
      text: 'The painful job is nightly closing.',
      idempotencyKey: randomUUID(),
    });
    expect(turn.interactionType).toBe('ask');
    expect(turn.proposalId).toBeNull();
    const sections = await caller.record.listSections({ projectId: created.id });
    expect(sections.every((item) => item.item.status !== 'accepted')).toBe(true);
    const replayKey = randomUUID();
    const first = await caller.cofounder.respond({
      projectId: created.id,
      text: 'The painful job is nightly closing.',
      idempotencyKey: replayKey,
    });
    const replayed = await caller.cofounder.respond({
      projectId: created.id,
      text: 'The painful job is nightly closing.',
      idempotencyKey: replayKey,
    });
    expect(replayed.operation?.id).toBe(first.operation?.id);
    expect(replayed.explanation).toBe(first.explanation);
  });

  it('moves an older Idea-stage journey forward once its founder context is already saved', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `captured-idea-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const caller = appRouter.createCaller(
      await createTestContext(sql, user, { cofounderWorkerEnabled: false }),
    );
    const created = await caller.project.create({
      workspaceId: workspace.id,
      name: 'Cafe books',
      idempotencyKey: randomUUID(),
    });
    const initial = await caller.journey.getOverview({ projectId: created.id });
    expect(initial.journey.currentStage).toBe('idea');
    const idea = await caller.record.getSection({
      projectId: created.id,
      section: 'idea_founder_context',
    });
    await caller.record.saveSection({
      projectId: created.id,
      section: 'idea_founder_context',
      expectedRevision: idea.item.revision,
      summary: 'Cafe owners lose two hours every night closing the books by hand.',
      idempotencyKey: randomUUID(),
    });
    await caller.journey.revisitStage({
      projectId: created.id,
      stage: 'problem',
      mode: 'advance',
      expectedRevision: initial.journey.revision,
      idempotencyKey: randomUUID(),
    });
    const advanced = await caller.journey.getOverview({ projectId: created.id });
    expect(advanced.journey.currentStage).toBe('problem');
    expect(advanced.recommendedStep?.stage).toBe('problem');
  });

  it('lets the founder save a record section as an accepted version', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `save-section-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const caller = appRouter.createCaller(
      await createTestContext(sql, user, { cofounderWorkerEnabled: false }),
    );
    const created = await caller.project.create({
      workspaceId: workspace.id,
      name: 'Cafe books',
      founderPitch: 'Cafe owners lose two hours closing the books.',
      idempotencyKey: randomUUID(),
    });
    const sections = await caller.record.listSections({ projectId: created.id });
    const idea = sections.find((item) => item.section === 'idea_founder_context');
    if (idea === undefined) {
      throw new Error('expected idea section');
    }
    const saved = await caller.record.saveSection({
      projectId: created.id,
      section: 'idea_founder_context',
      expectedRevision: idea.item.revision,
      summary: 'Cafe owners lose two hours every night closing the books by hand.',
      idempotencyKey: randomUUID(),
    });
    expect(saved.versionNumber).toBeGreaterThan(0);
    const detail = await caller.record.getSection({
      projectId: created.id,
      section: 'idea_founder_context',
    });
    expect(detail.item.status).toBe('accepted');
    expect(detail.item.content.summary).toContain('closing the books');
    expect(detail.versionNumber).toBe(saved.versionNumber);
  });
});
