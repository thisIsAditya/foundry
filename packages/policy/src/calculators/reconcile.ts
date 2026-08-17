import type { MarketComputedResult, MoneyRules, UnitEconomicsResult } from '@foundry/domain';

import { cmp } from './decimal.js';

export type ReconciliationWarning = {
  code: string;
  detail: string;
};

export function reconcileMoneyIdentities(input: {
  moneyRules: MoneyRules;
  market?: MarketComputedResult | null;
  unitEconomics?: UnitEconomicsResult | null;
}): ReconciliationWarning[] {
  const warnings: ReconciliationWarning[] = [];
  if (input.market !== undefined && input.market !== null) {
    if (cmp(input.market.price, input.moneyRules.price) !== 0) {
      warnings.push({
        code: 'price_mismatch',
        detail: 'Market size used a price that does not match current MoneyRules.',
      });
    }
    if (input.market.currency !== input.moneyRules.currency) {
      warnings.push({
        code: 'currency_mismatch',
        detail: 'Market size currency does not match current MoneyRules.',
      });
    }
  }
  if (input.unitEconomics !== undefined && input.unitEconomics !== null) {
    if (cmp(input.unitEconomics.price, input.moneyRules.price) !== 0) {
      warnings.push({
        code: 'price_mismatch',
        detail: 'Unit economics used a price that does not match current MoneyRules.',
      });
    }
    if (input.unitEconomics.currency !== input.moneyRules.currency) {
      warnings.push({
        code: 'currency_mismatch',
        detail: 'Unit economics currency does not match current MoneyRules.',
      });
    }
  }
  return warnings;
}
