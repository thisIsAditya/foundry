import { CofounderTurnSchema, type CofounderTurn } from '@foundry/api-contracts';
import type { CofounderOperation } from '@foundry/domain';
import { z } from 'zod';

export const CofounderOperationRecoverySchema = z.object({
  turn: z.unknown().optional(),
  founderMessageId: z.string().uuid().optional(),
  cofounderMessageId: z.string().uuid().optional(),
  proposalId: z.string().uuid().nullable().optional(),
  attempt: z.number().int().positive().optional(),
  executor: z.enum(['inline', 'worker']).optional(),
  claimedAt: z.string().optional(),
  category: z.string().optional(),
});
export type CofounderOperationRecovery = z.infer<typeof CofounderOperationRecoverySchema>;

export function parseOperationRecovery(value: unknown): CofounderOperationRecovery {
  const parsed = CofounderOperationRecoverySchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export function replayedTurn(operation: CofounderOperation): CofounderTurn | null {
  const recovery = parseOperationRecovery(operation.recovery);
  if (recovery.turn === undefined || typeof recovery.turn !== 'object' || recovery.turn === null) {
    return null;
  }
  const parsed = CofounderTurnSchema.safeParse({
    ...recovery.turn,
    operation,
  });
  return parsed.success ? parsed.data : null;
}
