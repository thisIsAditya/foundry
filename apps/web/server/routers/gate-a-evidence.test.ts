import { insertUser } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext } from '../test/context';
import { sql } from '../test/harness';

describe('Gate A evidence path', () => {
  it('passes once three non-friend interviews, quotes, a beachhead, and a DMU exist', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `gate-a-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const caller = appRouter.createCaller(await createTestContext(sql, user));
    const project = await caller.project.create({
      workspaceId: workspace.id,
      name: 'Venture',
      idempotencyKey: randomUUID(),
    });

    const before = await caller.project.getDeskSummary({ projectId: project.id });
    expect(before.gateA.passed).toBe(false);
    expect(before.nextAction).toBe('Set canonical MoneyRules.');

    await caller.moneyRules.setCurrent({
      projectId: project.id,
      currency: 'USD',
      unitOfSale: 'seat-month',
      price: '49',
      costStructure: {
        cogs: '5',
        variableCostPerUnit: '2',
        cac: '100',
        lifetimePeriods: 12,
      },
      idempotencyKey: randomUUID(),
    });

    for (let i = 0; i < 3; i += 1) {
      await caller.evidence.addInterview({
        projectId: project.id,
        participantType: 'non_friend',
        consent: { given: true },
        quotes: [`Quote ${String(i)}: we lose hours every week on this.`],
        idempotencyKey: randomUUID(),
      });
    }

    const midway = await caller.project.getDeskSummary({ projectId: project.id });
    expect(midway.gateA.qualifyingInterviews).toBe(3);
    expect(midway.gateA.passed).toBe(false);
    expect(midway.nextAction).toBe('Capture interview evidence.');

    const beachhead = await caller.pack.upsertBeachhead({
      projectId: project.id,
      segmentDefinition: 'Solo bookkeepers serving 5-20 small businesses',
      idempotencyKey: randomUUID(),
    });
    expect(beachhead.segmentDefinition).toContain('bookkeepers');

    await caller.pack.upsertDmu({
      projectId: project.id,
      beachheadId: beachhead.id,
      buyer: 'Owner-operator',
      idempotencyKey: randomUUID(),
    });

    const after = await caller.project.getDeskSummary({ projectId: project.id });
    expect(after.gateA.passed).toBe(true);
    expect(after.nextAction).not.toBe('Capture interview evidence.');
  });
});
