import { z } from 'zod';

import {
  BudgetLedgerEntryIdSchema,
  ProjectIdSchema,
  SprintIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import { BudgetEntryTypeSchema } from '../status/execution-status.js';
import { DecimalStringSchema, InstantSchema } from '../value-objects/primitives.js';

export const BudgetLedgerEntrySchema = z.object({
  id: BudgetLedgerEntryIdSchema,
  workspaceId: WorkspaceIdSchema,
  projectId: ProjectIdSchema.nullable().default(null),
  sprintId: SprintIdSchema.nullable().default(null),
  entryType: BudgetEntryTypeSchema,
  amountUsd: DecimalStringSchema,
  createdAt: InstantSchema,
});
export type BudgetLedgerEntry = z.infer<typeof BudgetLedgerEntrySchema>;
