import { tool, type Tool } from 'ai';
import {
  CostStructureSchema,
  DecimalStringSchema,
  IsoCurrencySchema,
  MarketFormulaSpecSchema,
  MarketInputsSchema,
  MoneyRulesSchema,
} from '@foundry/domain';
import {
  calculateMarketSize,
  calculateSensitivity,
  calculateUnitEconomics,
  reconcileMoneyIdentities,
} from '@foundry/policy';
import { z } from 'zod';

const MarketToolInputSchema = z.object({
  spec: MarketFormulaSpecSchema,
  inputs: MarketInputsSchema,
  price: DecimalStringSchema,
});

const UnitEconomicsToolInputSchema = z.object({
  price: DecimalStringSchema,
  currency: IsoCurrencySchema,
  costStructure: CostStructureSchema,
});

export const marketCalculatorTool: Tool = tool({
  description:
    'Compute bottom-up TAM/SAM/SOM from accounts, units, periods, and the canonical MoneyRules price. Do not use this tool to invent a market from an unexamined idea or to bypass MoneyRules.',
  inputSchema: MarketToolInputSchema,
  execute: async (input) => calculateMarketSize(input),
});

export const unitEconomicsCalculatorTool: Tool = tool({
  description:
    'Compute contribution, gross margin, LTV, CAC, and payback from MoneyRules. Never compute these figures in prose.',
  inputSchema: UnitEconomicsToolInputSchema,
  execute: async (input) => calculateUnitEconomics(input),
});

export const sensitivityCalculatorTool: Tool = tool({
  description:
    'Run percentage shocks on price, CAC, COGS, and lifetime. Use after unit economics, not instead of it.',
  inputSchema: UnitEconomicsToolInputSchema,
  execute: async (input) => calculateSensitivity(input),
});

export const reconciliationCheckerTool: Tool = tool({
  description:
    'Check that market size and unit economics use the same canonical MoneyRules price and currency. Do not treat a matching total as evidence.',
  inputSchema: z.object({
    moneyRules: MoneyRulesSchema,
    market: z
      .object({
        price: DecimalStringSchema,
        currency: IsoCurrencySchema,
      })
      .optional(),
    unitEconomics: z
      .object({
        price: DecimalStringSchema,
        currency: IsoCurrencySchema,
      })
      .optional(),
  }),
  execute: async (input) =>
    reconcileMoneyIdentities({
      moneyRules: input.moneyRules,
      ...(input.market === undefined
        ? {}
        : {
            market: {
              tam: '0',
              sam: '0',
              som: '0',
              volumeTam: '0',
              volumeSam: '0',
              volumeSom: '0',
              price: input.market.price,
              currency: input.market.currency,
              formula: 'n/a',
              warnings: [],
            },
          }),
      ...(input.unitEconomics === undefined
        ? {}
        : {
            unitEconomics: {
              price: input.unitEconomics.price,
              cogs: '0',
              variableCostPerUnit: '0',
              contribution: '0',
              grossMargin: '0',
              cac: '0',
              ltv: '0',
              paybackPeriods: null,
              ltvCac: null,
              currency: input.unitEconomics.currency,
              formula: 'n/a',
              warnings: [],
            },
          }),
    }),
});
