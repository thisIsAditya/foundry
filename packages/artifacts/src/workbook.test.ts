import { describe, expect, it } from 'vitest';

import { dependentsOf } from './dependency-graph.js';
import { buildMarketEconomicsWorkbook } from './workbook.js';
import {
  MoneyRulesIdSchema,
  PackRevisionIdSchema,
  ProjectIdSchema,
  type MoneyRules,
} from '@foundry/domain';
import { calculateMarketSize, calculateSensitivity, calculateUnitEconomics } from '@foundry/policy';

const moneyRules: MoneyRules = {
  id: MoneyRulesIdSchema.parse('11111111-1111-4111-8111-111111111111'),
  projectId: ProjectIdSchema.parse('22222222-2222-4222-8222-222222222222'),
  packRevisionId: PackRevisionIdSchema.parse('33333333-3333-4333-8333-333333333333'),
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
  isCurrent: true,
  createdAt: new Date('2026-04-01T00:00:00.000Z'),
};

describe('market economics workbook', () => {
  it('marks the workbook stale when MoneyRules change', () => {
    expect(dependentsOf('money_rules')).toContain('market_economics_workbook');
  });

  it('embeds validated calculator values and Excel formulas', () => {
    const marketInputs = {
      totalAccounts: '100',
      servedAccounts: '40',
      beachheadAccounts: '10',
      unitsPerAccountPerPeriod: '1',
      captureRate: '0.5',
      currency: 'INR',
    };
    const market = calculateMarketSize({
      spec: { kind: 'bottom_up', periodsPerYear: 12 },
      price: moneyRules.price,
      inputs: marketInputs,
    });
    const unitEconomics = calculateUnitEconomics({
      price: moneyRules.price,
      currency: moneyRules.currency,
      costStructure: moneyRules.costStructure,
    });
    const xlsx = buildMarketEconomicsWorkbook({
      moneyRules,
      marketInputs,
      market,
      unitEconomics,
      sensitivity: calculateSensitivity({
        price: moneyRules.price,
        currency: moneyRules.currency,
        costStructure: moneyRules.costStructure,
      }),
      warnings: [],
      generatedAt: new Date('2026-04-01T00:00:00.000Z'),
    });
    expect(xlsx.subarray(0, 2).toString('utf8')).toBe('PK');
    expect(xlsx.toString('utf8')).toContain('MoneyRules');
    expect(xlsx.toString('utf8')).toContain('Inputs!B2*Inputs!B5*Inputs!B7*MoneyRules!B4');
    expect(xlsx.toString('utf8')).toContain(market.som);
  });
});
