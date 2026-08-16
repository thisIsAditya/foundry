import { z } from 'zod';

export const SchemaRefSchema = z.object({
  name: z.string().min(1),
  version: z.number().int().positive(),
});
export type SchemaRef = z.infer<typeof SchemaRefSchema>;
