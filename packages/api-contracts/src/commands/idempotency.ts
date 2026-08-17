import { z } from 'zod';

export const IdempotencyKeySchema = z.uuid();
export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>;
