import { z } from 'zod';

export const DecimalStringSchema = z.string().regex(/^-?\d+(\.\d+)?$/);
export type DecimalString = z.infer<typeof DecimalStringSchema>;

export const IsoCurrencySchema = z.string().regex(/^[A-Z]{3}$/);
export type IsoCurrency = z.infer<typeof IsoCurrencySchema>;

export const InstantSchema = z.coerce.date();
export type Instant = z.infer<typeof InstantSchema>;
