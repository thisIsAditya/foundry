import { insertUser, insertWorkspace, insertWorkspaceMembership } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext } from '../test/context';
import { sql } from '../test/harness';

const costStructure = {
  cogs: '20',
  variableCostPerUnit: '5',
  cac: '150',
  lifetimePeriods: 24,
};

describe('money, WTP, and workbook procedures', () => {
  it('sets canonical price, computes market size, and generates a workbook', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `money-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const project = await appRouter
      .createCaller(await createTestContext(sql, user))
      .project.create({
        workspaceId: workspace.id,
        name: 'Cafe OS',
        idempotencyKey: randomUUID(),
      });
    const ctx = await createTestContext(sql, user);
    const caller = appRouter.createCaller(ctx);

    const money = await caller.moneyRules.setCurrent({
      projectId: project.id,
      currency: 'INR',
      unitOfSale: 'seat-month',
      price: '99',
      billingFrequency: 'monthly',
      costStructure,
      idempotencyKey: randomUUID(),
    });
    expect(money.moneyRules.price).toBe('99');
    expect(money.unitEconomics.ltv).toBe('1776');

    const market = await caller.moneyRules.upsertMarket({
      projectId: project.id,
      inputs: {
        totalAccounts: '1000',
        servedAccounts: '200',
        beachheadAccounts: '20',
        unitsPerAccountPerPeriod: '1',
        captureRate: '0.25',
        currency: 'INR',
      },
      idempotencyKey: randomUUID(),
    });
    expect(market.computedResult?.som).toBe('5940');

    const generated = await caller.artifact.generateWorkbook({
      projectId: project.id,
      idempotencyKey: randomUUID(),
    });
    expect(generated.version.status).toBe('generating');
    expect(generated.version.s3Key.endsWith('.xlsx')).toBe(true);

    await caller.moneyRules.setCurrent({
      projectId: project.id,
      currency: 'INR',
      unitOfSale: 'seat-month',
      price: '120',
      costStructure,
      idempotencyKey: randomUUID(),
    });
    const listed = await caller.artifact.list({ projectId: project.id });
    expect(listed[0]?.currentVersionId).toBeNull();
  });

  it('refuses Gate B for waitlists and friend payments', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `wtp-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const project = await appRouter
      .createCaller(await createTestContext(sql, user))
      .project.create({
        workspaceId: workspace.id,
        name: 'Cafe OS',
        idempotencyKey: randomUUID(),
      });
    const caller = appRouter.createCaller(await createTestContext(sql, user));

    await caller.wtp.record({
      projectId: project.id,
      participantClass: 'independent_prospect',
      instrument: 'waitlist',
      idempotencyKey: randomUUID(),
    });
    const waitlist = await caller.wtp.evaluateGateB({ projectId: project.id });
    expect(waitlist.evaluation.result).toBe('failed');

    await caller.wtp.record({
      projectId: project.id,
      participantClass: 'friend',
      instrument: 'invoice',
      amount: '1000',
      currency: 'INR',
      idempotencyKey: randomUUID(),
    });
    const friends = await caller.wtp.evaluateGateB({ projectId: project.id });
    expect(friends.evaluation.result).toBe('failed');

    await caller.wtp.record({
      projectId: project.id,
      participantClass: 'independent_prospect',
      instrument: 'paid_pilot',
      amount: '5000',
      currency: 'INR',
      idempotencyKey: randomUUID(),
    });
    const passed = await caller.wtp.evaluateGateB({ projectId: project.id });
    expect(passed.evaluation.result).toBe('passed');
    expect(passed.gate.gateType).toBe('gate_b');
  });

  it('forbids a viewer from changing MoneyRules', async () => {
    const owner = await insertUser(sql, {
      name: 'Owner',
      email: `owner-${randomUUID()}@example.com`,
    });
    const viewer = await insertUser(sql, {
      name: 'Viewer',
      email: `viewer-${randomUUID()}@example.com`,
    });
    const workspace = await insertWorkspace(sql, {
      name: 'Acme',
      ownerUserId: owner.id,
    });
    await insertWorkspaceMembership(sql, {
      workspaceId: workspace.id,
      userId: owner.id,
      role: 'owner',
    });
    await insertWorkspaceMembership(sql, {
      workspaceId: workspace.id,
      userId: viewer.id,
      role: 'viewer',
    });
    const ownerCaller = appRouter.createCaller(await createTestContext(sql, owner));
    const project = await ownerCaller.project.create({
      workspaceId: workspace.id,
      name: 'Cafe OS',
      idempotencyKey: randomUUID(),
    });
    const viewerCaller = appRouter.createCaller(await createTestContext(sql, viewer));
    await expect(
      viewerCaller.moneyRules.setCurrent({
        projectId: project.id,
        currency: 'INR',
        unitOfSale: 'seat',
        price: '10',
        costStructure,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      cause: { code: 'policy_forbidden' },
    });
  });
});
