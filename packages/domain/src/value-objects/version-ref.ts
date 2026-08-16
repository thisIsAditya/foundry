import { z } from 'zod';

export const VersionRefSchema = z.object({
  entityId: z.uuid(),
  version: z.number().int().positive(),
});
export type VersionRef = z.infer<typeof VersionRefSchema>;
