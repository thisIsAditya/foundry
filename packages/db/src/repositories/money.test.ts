import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { insertProject } from './projects.js';
import { insertUser } from './users.js';
import { insertWorkspace } from './workspaces.js';
import { insertPackRevision } from './pack-revisions.js';
import { insertCurrentMoneyRules, getCurrentMoneyRules } from './money-rules.js';
import { insertMarketModel } from './market-models.js';
import { insertExperiment } from './experiments.js';
import { insertWtpEvent, listWtpEventsByProjectId } from './wtp-events.js';
import { sql } from '../test/harness.js';
import { withWorkspaceScope } from '../rls.js';

describe('money repositories', () => {
  it('keeps a single current MoneyRules row and logs WTP events', async () => {
    const owner = await insertUser(sql, {
      name: 'Owner',
      email: `money-${randomUUID()}@example.com`,
    });
    const workspace = await insertWorkspace(sql, {
      name: 'Acme',
      ownerUserId: owner.id,
    });
    const project = await insertProject(sql, {
      workspaceId: workspace.id,
      name: 'Venture',
    });

    await withWorkspaceScope(sql, [workspace.id], async (tx) => {
      const pack = await insertPackRevision(tx, {
        projectId: project.id,
        revisionNumber: 1,
        actorType: 'founder',
        actorId: owner.id,
        proposedChanges: {},
      });
      const first = await insertCurrentMoneyRules(tx, {
        projectId: project.id,
        packRevisionId: pack.id,
        currency: 'INR',
        unitOfSale: 'seat-month',
        price: '99',
        billingFrequency: 'monthly',
        costStructure: {
          cogs: '20',
          variableCostPerUnit: '5',
          cac: '150',
          lifetimePeriods: 24,
        },
      });
      const second = await insertCurrentMoneyRules(tx, {
        projectId: project.id,
        packRevisionId: pack.id,
        currency: 'INR',
        unitOfSale: 'seat-month',
        price: '149',
        costStructure: {
          cogs: '20',
          variableCostPerUnit: '5',
          cac: '150',
          lifetimePeriods: 24,
        },
      });
      expect(first.isCurrent).toBe(true);
      expect(second.isCurrent).toBe(true);
      expect((await getCurrentMoneyRules(tx, project.id))?.price).toBe('149');

      await insertMarketModel(tx, {
        packRevisionId: pack.id,
        formulaSpec: { kind: 'bottom_up', periodsPerYear: 12 },
        inputs: {
          totalAccounts: '100',
          servedAccounts: '40',
          beachheadAccounts: '10',
          unitsPerAccountPerPeriod: '1',
          captureRate: '0.5',
          currency: 'INR',
        },
      });

      const experiment = await insertExperiment(tx, {
        projectId: project.id,
        hypothesis: 'Strangers will pay for a pilot',
        method: 'paid_pilot',
        threshold: { minEvents: 1 },
      });
      await insertWtpEvent(tx, {
        projectId: project.id,
        experimentId: experiment.id,
        participantClass: 'independent_prospect',
        instrument: 'paid_pilot',
        amount: '5000',
        currency: 'INR',
      });
      expect(await listWtpEventsByProjectId(tx, project.id)).toHaveLength(1);
    });
  });
});
