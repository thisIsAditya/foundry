import type {
  MarketComputedResult,
  MarketInputs,
  MoneyRules,
  SensitivityResult,
  UnitEconomicsResult,
} from '@foundry/domain';
import type { ReconciliationWarning } from '@foundry/policy';

import { buildXlsx, type Sheet, type SheetCell } from './xlsx.js';

export type MarketEconomicsWorkbookInput = {
  moneyRules: MoneyRules;
  marketInputs: MarketInputs;
  market: MarketComputedResult;
  unitEconomics: UnitEconomicsResult;
  sensitivity: SensitivityResult;
  warnings: readonly ReconciliationWarning[];
  generatedAt: Date;
};

function label(ref: string, text: string): SheetCell {
  return { ref, type: 'inlineStr', value: text };
}

function numberCell(ref: string, value: string): SheetCell {
  return { ref, type: 'n', value };
}

function formula(ref: string, expr: string): SheetCell {
  return { ref, type: 'f', formula: expr };
}

export function buildMarketEconomicsWorkbook(input: MarketEconomicsWorkbookInput): Buffer {
  const { moneyRules, marketInputs, market, unitEconomics, sensitivity, warnings, generatedAt } =
    input;
  const inputs: Sheet = {
    name: 'Inputs',
    cells: [
      label('A1', 'Field'),
      label('B1', 'Value'),
      label('C1', 'Kind'),
      label('A2', 'total_accounts'),
      numberCell('B2', marketInputs.totalAccounts),
      label('C2', 'founder_input'),
      label('A3', 'served_accounts'),
      numberCell('B3', marketInputs.servedAccounts),
      label('C3', 'founder_input'),
      label('A4', 'beachhead_accounts'),
      numberCell('B4', marketInputs.beachheadAccounts),
      label('C4', 'founder_input'),
      label('A5', 'units_per_account_per_period'),
      numberCell('B5', marketInputs.unitsPerAccountPerPeriod),
      label('C5', 'founder_input'),
      label('A6', 'capture_rate'),
      numberCell('B6', marketInputs.captureRate),
      label('C6', 'assumption'),
      label('A7', 'periods_per_year'),
      numberCell('B7', '12'),
      label('C7', 'formula_spec'),
    ],
  };
  const money: Sheet = {
    name: 'MoneyRules',
    cells: [
      label('A1', 'Field'),
      label('B1', 'Value'),
      label('A2', 'currency'),
      label('B2', moneyRules.currency),
      label('A3', 'unit_of_sale'),
      label('B3', moneyRules.unitOfSale),
      label('A4', 'price'),
      numberCell('B4', moneyRules.price),
      label('A5', 'cogs'),
      numberCell('B5', moneyRules.costStructure.cogs),
      label('A6', 'variable_cost_per_unit'),
      numberCell('B6', moneyRules.costStructure.variableCostPerUnit),
      label('A7', 'cac'),
      numberCell('B7', moneyRules.costStructure.cac),
      label('A8', 'lifetime_periods'),
      numberCell('B8', String(moneyRules.costStructure.lifetimePeriods)),
    ],
  };
  const marketSheet: Sheet = {
    name: 'Market',
    cells: [
      label('A1', 'Metric'),
      label('B1', 'Formula'),
      label('C1', 'Calculator'),
      label('A2', 'TAM'),
      formula('B2', 'Inputs!B2*Inputs!B5*Inputs!B7*MoneyRules!B4'),
      numberCell('C2', market.tam),
      label('A3', 'SAM'),
      formula('B3', 'Inputs!B3*Inputs!B5*Inputs!B7*MoneyRules!B4'),
      numberCell('C3', market.sam),
      label('A4', 'SOM'),
      formula('B4', 'Inputs!B4*Inputs!B5*Inputs!B7*Inputs!B6*MoneyRules!B4'),
      numberCell('C4', market.som),
    ],
  };
  const economics: Sheet = {
    name: 'UnitEconomics',
    cells: [
      label('A1', 'Metric'),
      label('B1', 'Formula'),
      label('C1', 'Calculator'),
      label('A2', 'contribution'),
      formula('B2', 'MoneyRules!B4-MoneyRules!B5-MoneyRules!B6'),
      numberCell('C2', unitEconomics.contribution),
      label('A3', 'gross_margin'),
      formula('B3', '(MoneyRules!B4-MoneyRules!B5)/MoneyRules!B4'),
      numberCell('C3', unitEconomics.grossMargin),
      label('A4', 'ltv'),
      formula('B4', 'B2*MoneyRules!B8'),
      numberCell('C4', unitEconomics.ltv),
      label('A5', 'payback_periods'),
      formula('B5', 'MoneyRules!B7/B2'),
      numberCell('C5', unitEconomics.paybackPeriods ?? ''),
      label('A6', 'ltv_cac'),
      formula('B6', 'B4/MoneyRules!B7'),
      numberCell('C6', unitEconomics.ltvCac ?? ''),
    ],
  };
  const sensitivitySheet: Sheet = {
    name: 'Sensitivity',
    cells: [
      label('A1', 'Input'),
      label('B1', 'Delta %'),
      label('C1', 'LTV'),
      label('D1', 'Payback'),
      ...sensitivity.shocks.flatMap((shock, index) => {
        const row = index + 2;
        return [
          label(`A${row}`, shock.input),
          numberCell(`B${row}`, shock.deltaPercent),
          numberCell(`C${row}`, shock.result.ltv),
          numberCell(`D${row}`, shock.result.paybackPeriods ?? ''),
        ];
      }),
    ],
  };
  const summary: Sheet = {
    name: 'Summary',
    cells: [
      label('A1', 'Canonical price'),
      numberCell('B1', moneyRules.price),
      label('A2', 'Currency'),
      label('B2', moneyRules.currency),
      label('A3', 'SOM'),
      numberCell('B3', market.som),
      label('A4', 'LTV'),
      numberCell('B4', unitEconomics.ltv),
      label('A5', 'CAC'),
      numberCell('B5', unitEconomics.cac),
    ],
  };
  const sources: Sheet = {
    name: 'Sources',
    cells: [
      label('A1', 'All numeric values are workflow_derived from MoneyRules and calculator specs.'),
      label('A2', 'Formulas in Market and UnitEconomics sheets are the validated identities.'),
    ],
  };
  const changeLog: Sheet = {
    name: 'ChangeLog',
    cells: [
      label('A1', 'generated_at'),
      label('B1', generatedAt.toISOString()),
      label('A2', 'warnings'),
      label('B2', warnings.map((warning) => warning.detail).join('; ') || 'none'),
    ],
  };

  return buildXlsx([
    inputs,
    { name: 'Assumptions', cells: [label('A1', 'capture_rate is an explicit assumption')] },
    money,
    marketSheet,
    economics,
    sensitivitySheet,
    summary,
    sources,
    changeLog,
  ]);
}

export const MARKET_ECONOMICS_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
