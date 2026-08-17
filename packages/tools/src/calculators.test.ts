import { describe, expect, it } from 'vitest';

import { marketCalculatorTool, unitEconomicsCalculatorTool } from './calculators.js';
import { calculateMarketSize, calculateUnitEconomics } from '@foundry/policy';

describe('calculator tools', () => {
  it('wraps the same pure calculators used outside the model loop', async () => {
    const marketInput = {
      spec: { kind: 'bottom_up' as const, periodsPerYear: 12 },
      price: '10',
      inputs: {
        totalAccounts: '10',
        servedAccounts: '5',
        beachheadAccounts: '2',
        unitsPerAccountPerPeriod: '1',
        captureRate: '1',
        currency: 'INR',
      },
    };
    const unitInput = {
      price: '10',
      currency: 'INR',
      costStructure: {
        cogs: '2',
        variableCostPerUnit: '1',
        cac: '20',
        lifetimePeriods: 5,
      },
    };
    expect(marketCalculatorTool.description).toMatch(/Do not use this tool to invent/);
    expect(unitEconomicsCalculatorTool.description).toMatch(/Never compute/);
    expect(calculateMarketSize(marketInput)).toMatchObject({ tam: '1200', som: '240' });
    expect(calculateUnitEconomics(unitInput)).toMatchObject({ contribution: '7', ltv: '35' });
  });
});
