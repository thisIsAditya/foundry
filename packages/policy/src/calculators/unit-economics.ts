import type { CostStructure, UnitEconomicsResult } from '@foundry/domain';

import { div, mul, sub } from './decimal.js';

export type UnitEconomicsInput = {
  price: string;
  currency: string;
  costStructure: CostStructure;
};

export function calculateUnitEconomics(input: UnitEconomicsInput): UnitEconomicsResult {
  const warnings: string[] = [];
  const { cogs, variableCostPerUnit, cac, lifetimePeriods } = input.costStructure;
  const contribution = sub(sub(input.price, cogs), variableCostPerUnit);
  const grossMargin = div(sub(input.price, cogs), input.price);
  if (grossMargin === null) {
    warnings.push('Price is zero; gross margin is undefined.');
  }
  const ltv = mul(contribution, String(lifetimePeriods));
  const paybackPeriods = div(cac, contribution);
  const ltvCac = div(ltv, cac);
  if (paybackPeriods === null) {
    warnings.push('Contribution is zero; payback is undefined.');
  }
  if (ltvCac === null) {
    warnings.push('CAC is zero; LTV/CAC is undefined.');
  }

  return {
    price: input.price,
    cogs,
    variableCostPerUnit,
    contribution,
    grossMargin: grossMargin ?? '0',
    cac,
    ltv,
    paybackPeriods,
    ltvCac,
    currency: input.currency,
    formula:
      'contribution = price − cogs − variable_cost; LTV = contribution × lifetime_periods; payback = CAC / contribution',
    warnings,
  };
}
