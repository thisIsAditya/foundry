import { describe, expect, it } from 'vitest';

import { calculateMarketSize } from './market.js';
import { reconcileMoneyIdentities } from './reconcile.js';
import { calculateSensitivity } from './sensitivity.js';
import { calculateUnitEconomics } from './unit-economics.js';
import {
  MoneyRulesIdSchema,
  PackRevisionIdSchema,
  ProjectIdSchema,
  type MoneyRules,
} from '@foundry/domain';

const costStructure = {
  cogs: '20',
  variableCostPerUnit: '5',
  cac: '150',
  lifetimePeriods: 24,
};

describe('market and unit-economics calculators', () => {
  it('computes bottom-up TAM/SAM/SOM from accounts, units, and price', () => {
    const result = calculateMarketSize({
      spec: { kind: 'bottom_up', periodsPerYear: 12 },
      price: '99',
      inputs: {
        totalAccounts: '10000',
        servedAccounts: '2000',
        beachheadAccounts: '200',
        unitsPerAccountPerPeriod: '1',
        captureRate: '0.25',
        currency: 'INR',
      },
    });
    expect(result.tam).toBe('11880000');
    expect(result.sam).toBe('2376000');
    expect(result.som).toBe('59400');
    expect(result.warnings).toEqual([]);
  });

  it('computes contribution, LTV, CAC, and payback outside the model', () => {
    const result = calculateUnitEconomics({
      price: '99',
      currency: 'INR',
      costStructure,
    });
    expect(result.contribution).toBe('74');
    expect(result.ltv).toBe('1776');
    expect(result.paybackPeriods).toBe('2.027');
    expect(result.ltvCac).toBe('11.84');
  });

  it('runs sensitivity shocks without a language model', () => {
    const result = calculateSensitivity({
      price: '99',
      currency: 'INR',
      costStructure,
    });
    expect(result.shocks.length).toBeGreaterThan(0);
    const priceDown = result.shocks.find(
      (shock) => shock.input === 'price' && shock.deltaPercent === '-20',
    );
    expect(priceDown?.result.price).toBe('79.2');
  });

  it('flags market totals that silently diverge from MoneyRules', () => {
    const moneyRules: MoneyRules = {
      id: MoneyRulesIdSchema.parse('11111111-1111-4111-8111-111111111111'),
      projectId: ProjectIdSchema.parse('22222222-2222-4222-8222-222222222222'),
      packRevisionId: PackRevisionIdSchema.parse('33333333-3333-4333-8333-333333333333'),
      currency: 'INR',
      unitOfSale: 'seat-month',
      price: '99',
      billingFrequency: 'monthly',
      costStructure,
      isCurrent: true,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
    };
    const market = calculateMarketSize({
      spec: { kind: 'bottom_up', periodsPerYear: 12 },
      price: '50',
      inputs: {
        totalAccounts: '10',
        servedAccounts: '5',
        beachheadAccounts: '2',
        unitsPerAccountPerPeriod: '1',
        captureRate: '1',
        currency: 'INR',
      },
    });
    const warnings = reconcileMoneyIdentities({ moneyRules, market });
    expect(warnings.some((warning) => warning.code === 'price_mismatch')).toBe(true);
  });
});
