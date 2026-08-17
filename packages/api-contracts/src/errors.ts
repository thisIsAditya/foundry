import { AppErrorCodes, type AppErrorCode } from '@foundry/observability';
import { z } from 'zod';

export const AppErrorCodeSchema = z.enum(AppErrorCodes);
export type { AppErrorCode };

export const ContractErrorSchema = z.object({
  code: AppErrorCodeSchema,
  explanation: z.string().min(1),
  retryable: z.boolean(),
  nextAction: z.string().min(1),
  correlationId: z.string().min(1).optional(),
});
export type ContractError = z.infer<typeof ContractErrorSchema>;
