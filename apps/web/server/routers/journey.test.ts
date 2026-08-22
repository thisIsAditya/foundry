import { insertUser } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext } from '../test/context';
import { sql } from '../test/harness';

describe('founder journey and record', () => {
  it('creates an Idea-stage record skeleton and one recommended step, not a research sprint', async () => {
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
    expect(overview.journey.currentStage).toBe('idea');
    expect(overview.recommendedStep).not.toBeNull();
    expect(overview.recommendedStep?.recommended).toBe(true);

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

    const started = await caller.journey.startStep({
      projectId: created.id,
      stepId: overview.recommendedStep!.id,
      expectedRevision: overview.recommendedStep!.revision,
      idempotencyKey: randomUUID(),
    });
    expect(started.status).toBe('in_progress');
    const completed = await caller.journey.submitStep({
      projectId: created.id,
      stepId: started.id,
      expectedRevision: started.revision,
      idempotencyKey: randomUUID(),
    });
    expect(completed.status).toBe('complete');
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
});
