import { z } from 'zod';

import { PackRevisionIdSchema, ProjectIdSchema, SprintIdSchema } from '../ids.js';
import { ActorTypeSchema, PackRevisionStatusSchema } from '../status/journey-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const PackRevisionSchema = z.object({
  id: PackRevisionIdSchema,
  projectId: ProjectIdSchema,
  revisionNumber: z.number().int().positive(),
  parentRevisionId: PackRevisionIdSchema.nullable().default(null),
  actorType: ActorTypeSchema,
  actorId: z.string().nullable().default(null),
  sourceSprintId: SprintIdSchema.nullable().default(null),
  status: PackRevisionStatusSchema,
  proposedChanges: z.unknown(),
  acceptedChanges: z.unknown().nullable().default(null),
  validationResults: z.unknown().nullable().default(null),
  gateResults: z.unknown().nullable().default(null),
  dependencyInvalidations: z.unknown().nullable().default(null),
  createdAt: InstantSchema,
  acceptedAt: InstantSchema.nullable().default(null),
});
export type PackRevision = z.infer<typeof PackRevisionSchema>;

export const CompanyPackSchema = z.object({
  projectId: ProjectIdSchema,
  currentRevisionId: PackRevisionIdSchema.nullable().default(null),
});
export type CompanyPack = z.infer<typeof CompanyPackSchema>;
