import type { SensitivityResult } from '@foundry/domain';

import { percentOf } from './decimal.js';
import { calculateUnitEconomics, type UnitEconomicsInput } from './unit-economics.js';

const DEFAULT_SHOCKS = ['-20', '-10', '10', '20'] as const;

export function calculateSensitivity(
  input: UnitEconomicsInput,
  shocks: readonly string[] = DEFAULT_SHOCKS,
): SensitivityResult {
  const base = calculateUnitEconomics(input);
  return {
    base,
    shocks: shocks.flatMap((deltaPercent) => {
      const priceShock = calculateUnitEconomics({
        ...input,
        price: percentOf(input.price, deltaPercent),
      });
      const cacShock = calculateUnitEconomics({
        ...input,
        costStructure: {
          ...input.costStructure,
          cac: percentOf(input.costStructure.cac, deltaPercent),
        },
      });
      const cogsShock = calculateUnitEconomics({
        ...input,
        costStructure: {
          ...input.costStructure,
          cogs: percentOf(input.costStructure.cogs, deltaPercent),
        },
      });
      const lifetimeShocked = percentOf(String(input.costStructure.lifetimePeriods), deltaPercent);
      const lifetimeInput: UnitEconomicsInput = {
        ...input,
        costStructure: {
          ...input.costStructure,
          lifetimePeriods: Number(lifetimeShocked),
        },
      };
      return [
        { input: 'price' as const, deltaPercent, result: priceShock },
        { input: 'cac' as const, deltaPercent, result: cacShock },
        { input: 'cogs' as const, deltaPercent, result: cogsShock },
        {
          input: 'lifetimePeriods' as const,
          deltaPercent,
          result: calculateUnitEconomics(lifetimeInput),
        },
      ];
    }),
  };
}
