import {
  BillingFrequencySchema,
  CostStructureSchema,
  DecimalStringSchema,
  IsoCurrencySchema,
  MarketFormulaSpecSchema,
  MarketInputsSchema,
  ProjectIdSchema,
} from '@foundry/domain';
import { z } from 'zod';

import { IdempotencyKeySchema } from './idempotency.js';

export const SetMoneyRulesInputSchema = z.object({
  projectId: ProjectIdSchema,
  currency: IsoCurrencySchema,
  unitOfSale: z.string().min(1),
  price: DecimalStringSchema,
  billingFrequency: BillingFrequencySchema.optional(),
  costStructure: CostStructureSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type SetMoneyRulesInput = z.infer<typeof SetMoneyRulesInputSchema>;

export const GetMoneyRulesInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type GetMoneyRulesInput = z.infer<typeof GetMoneyRulesInputSchema>;

export const UpsertMarketModelInputSchema = z.object({
  projectId: ProjectIdSchema,
  spec: MarketFormulaSpecSchema.default({ kind: 'bottom_up', periodsPerYear: 12 }),
  inputs: MarketInputsSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type UpsertMarketModelInput = z.infer<typeof UpsertMarketModelInputSchema>;

export const CreateExperimentInputSchema = z.object({
  projectId: ProjectIdSchema,
  hypothesis: z.string().min(1),
  method: z.string().min(1),
  threshold: z.unknown().default({}),
  idempotencyKey: IdempotencyKeySchema,
});
export type CreateExperimentInput = z.infer<typeof CreateExperimentInputSchema>;

export const RecordWtpEventInputSchema = z.object({
  projectId: ProjectIdSchema,
  experimentId: z.uuid().optional(),
  participantClass: z.enum(['friend', 'known_contact', 'independent_prospect']),
  instrument: z.enum([
    'paid_pilot',
    'invoice',
    'deposit',
    'loi',
    'concierge',
    'waitlist',
    'comment',
    'simulated',
  ]),
  amount: DecimalStringSchema.optional(),
  currency: IsoCurrencySchema.optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type RecordWtpEventInput = z.infer<typeof RecordWtpEventInputSchema>;

export const EvaluateGateBInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type EvaluateGateBInput = z.infer<typeof EvaluateGateBInputSchema>;

export const GenerateWorkbookInputSchema = z.object({
  projectId: ProjectIdSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type GenerateWorkbookInput = z.infer<typeof GenerateWorkbookInputSchema>;
