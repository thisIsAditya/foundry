import { insertPackRevision, insertUser, withWorkspaceScope } from '@foundry/db';
import { AppErrorCodes } from '@foundry/observability';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext, memoryStreamBus } from '../test/context';
import { createClarificationTestModel } from '../test/mock-model';
import { sql } from '../test/harness';

const costStructure = {
  cogs: '20',
  variableCostPerUnit: '5',
  cac: '150',
  lifetimePeriods: 24,
};

async function createProject() {
  const user = await insertUser(sql, {
    name: 'Founder',
    email: `score-${randomUUID()}@example.com`,
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
  return { caller, ctx, project };
}

describe('score procedures and recalculation call sites', () => {
  it('reads the current score, history, revision score, and dimension reasons', async () => {
    const { caller, project } = await createProject();
    const current = await caller.score.getCurrent({ projectId: project.id });
    expect(current === null || typeof current.overall === 'number').toBe(true);
    if (project.currentPackRevisionId === null) {
      throw new Error('expected a pack revision');
    }
    const forRevision = await caller.score.getForRevision({
      projectId: project.id,
      revisionId: project.currentPackRevisionId,
    });
    expect(forRevision?.packRevisionId).toBe(project.currentPackRevisionId);
    const history = await caller.score.getHistory({ projectId: project.id, limit: 10 });
    expect(history.length).toBeGreaterThan(0);
    const reasons = await caller.score.explain({
      projectId: project.id,
      dimension: 'customer_clarity',
    });
    expect(Array.isArray(reasons)).toBe(true);
  });

  it('writes a plan_scores row from interview capture', async () => {
    const { caller, project } = await createProject();
    const before = await caller.score.getHistory({ projectId: project.id, limit: 20 });
    await caller.evidence.addInterview({
      projectId: project.id,
      participantType: 'non_friend',
      consent: { given: true },
      quotes: ['We waste hours reconciling invoices.'],
      idempotencyKey: randomUUID(),
    });
    const after = await caller.score.getHistory({ projectId: project.id, limit: 20 });
    expect(after.length).toBeGreaterThan(before.length);
    expect(after[0]?.packRevisionId).toBe(project.currentPackRevisionId);
  });

  it('writes a plan_scores row from an observation', async () => {
    const { caller, project } = await createProject();
    const before = await caller.score.getHistory({ projectId: project.id, limit: 20 });
    await caller.evidence.recordObservation({
      projectId: project.id,
      summary: 'Owners mentioned weekend staffing pain.',
      sectionKey: 'problem',
      idempotencyKey: randomUUID(),
    });
    const after = await caller.score.getHistory({ projectId: project.id, limit: 20 });
    expect(after.length).toBeGreaterThan(before.length);
    expect(after[0]?.packRevisionId).toBe(project.currentPackRevisionId);
  });

  it('writes a plan_scores row from MoneyRules.setCurrent', async () => {
    const { caller, project } = await createProject();
    const before = await caller.score.getHistory({ projectId: project.id, limit: 20 });
    await caller.moneyRules.setCurrent({
      projectId: project.id,
      currency: 'INR',
      unitOfSale: 'seat-month',
      price: '99',
      billingFrequency: 'monthly',
      costStructure,
      idempotencyKey: randomUUID(),
    });
    const after = await caller.score.getHistory({ projectId: project.id, limit: 20 });
    expect(after.length).toBeGreaterThan(before.length);
    expect(after[0]?.packRevisionId).toBe(project.currentPackRevisionId);
  });

  it('writes a plan_scores row from a WTP event', async () => {
    const { caller, project } = await createProject();
    const before = await caller.score.getHistory({ projectId: project.id, limit: 20 });
    await caller.wtp.record({
      projectId: project.id,
      participantClass: 'independent_prospect',
      instrument: 'paid_pilot',
      amount: '5000',
      currency: 'INR',
      idempotencyKey: randomUUID(),
    });
    const after = await caller.score.getHistory({ projectId: project.id, limit: 20 });
    expect(after.length).toBeGreaterThan(before.length);
    expect(after[0]?.packRevisionId).toBe(project.currentPackRevisionId);
  });

  it('writes a plan_scores row from a metric observation', async () => {
    const { caller, project } = await createProject();
    const before = await caller.score.getHistory({ projectId: project.id, limit: 20 });
    const metric = await caller.metric.define({
      projectId: project.id,
      name: 'paying_strangers',
      unit: 'count',
      calculationSpec: { gateC: true, key: 'paying_strangers', threshold: '1' },
      idempotencyKey: randomUUID(),
    });
    await caller.metric.recordObservation({
      projectId: project.id,
      metricId: metric.id,
      value: '2',
      idempotencyKey: randomUUID(),
    });
    const after = await caller.score.getHistory({ projectId: project.id, limit: 20 });
    expect(after.length).toBeGreaterThan(before.length);
    expect(after[0]?.packRevisionId).toBe(project.currentPackRevisionId);
  });

  it('writes a plan_scores row when a pack revision is accepted', async () => {
    const { caller, project } = await createProject();
    const baseline = project.currentPackRevisionId;
    if (baseline === null) {
      throw new Error('expected a baseline pack revision');
    }
    const draft = await withWorkspaceScope(sql, [project.workspaceId], async (tx) =>
      insertPackRevision(tx, {
        projectId: project.id,
        revisionNumber: 2,
        parentRevisionId: baseline,
        actorType: 'agent',
        proposedChanges: {},
      }),
    );
    const before = await caller.score.getHistory({ projectId: project.id, limit: 20 });
    await caller.pack.acceptRevision({
      projectId: project.id,
      revisionId: draft.id,
      expectedRevision: draft.id,
      idempotencyKey: randomUUID(),
    });
    const after = await caller.score.getHistory({ projectId: project.id, limit: 20 });
    expect(after.length).toBeGreaterThan(before.length);
    expect(after[0]?.packRevisionId).toBe(draft.id);
  });

  it('does not throw gate_blocked from ordinary procedures when a gate fails', async () => {
    expect((AppErrorCodes as readonly string[]).includes('gate_blocked')).toBe(false);
    const { caller, ctx, project } = await createProject();
    await caller.evidence.addInterview({
      projectId: project.id,
      participantType: 'friend',
      consent: { given: true },
      quotes: ['Sounds great!'],
      idempotencyKey: randomUUID(),
    });
    const desk = await caller.project.getDeskSummary({ projectId: project.id });
    expect(desk.gateA.passed).toBe(false);

    const sent = await caller.conversation.send({
      projectId: project.id,
      text: 'Owners lose two hours closing the books.',
      idempotencyKey: randomUUID(),
    });
    expect(sent.text.length).toBeGreaterThan(0);
    expect(
      memoryStreamBus(ctx).entries.some(
        (entry) => entry.event.type === 'conversation_message_appended',
      ),
    ).toBe(true);

    await expect(
      caller.moneyRules.setCurrent({
        projectId: project.id,
        currency: 'INR',
        unitOfSale: 'seat-month',
        price: '99',
        costStructure,
        idempotencyKey: randomUUID(),
      }),
    ).resolves.toMatchObject({ moneyRules: { price: '99' } });

    const gate = await caller.gate.evaluate({
      projectId: project.id,
      gateType: 'gate_c',
      idempotencyKey: randomUUID(),
    });
    expect(gate.evaluation.result === 'failed' || gate.evaluation.result === 'passed').toBe(true);
    expect(gate.gate.result).toBe(gate.evaluation.result);
  });
});
