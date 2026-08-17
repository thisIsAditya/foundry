import type { MarketComputedResult, MarketFormulaSpec, MarketInputs } from '@foundry/domain';

import { mul } from './decimal.js';

export type MarketCalculatorInput = {
  spec: MarketFormulaSpec;
  inputs: MarketInputs;
  price: string;
};

function annualVolume(
  accounts: string,
  unitsPerAccountPerPeriod: string,
  periodsPerYear: number,
): string {
  return mul(mul(accounts, unitsPerAccountPerPeriod), String(periodsPerYear));
}

export function calculateMarketSize(input: MarketCalculatorInput): MarketComputedResult {
  const warnings: string[] = [];
  if (input.spec.kind !== 'bottom_up') {
    warnings.push('Unsupported market formula; only bottom-up is implemented.');
  }
  const volumeTam = annualVolume(
    input.inputs.totalAccounts,
    input.inputs.unitsPerAccountPerPeriod,
    input.spec.periodsPerYear,
  );
  const volumeSam = annualVolume(
    input.inputs.servedAccounts,
    input.inputs.unitsPerAccountPerPeriod,
    input.spec.periodsPerYear,
  );
  const volumeBeachhead = annualVolume(
    input.inputs.beachheadAccounts,
    input.inputs.unitsPerAccountPerPeriod,
    input.spec.periodsPerYear,
  );
  const volumeSom = mul(volumeBeachhead, input.inputs.captureRate);
  const formula =
    'accounts × units_per_account_per_period × periods_per_year × price; SOM applies capture_rate to beachhead volume';

  return {
    tam: mul(volumeTam, input.price),
    sam: mul(volumeSam, input.price),
    som: mul(volumeSom, input.price),
    volumeTam,
    volumeSam,
    volumeSom,
    price: input.price,
    currency: input.inputs.currency,
    formula,
    warnings,
  };
}
