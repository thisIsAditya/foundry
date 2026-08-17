import { z } from 'zod';

import {
  ConversationMessageIdSchema,
  ConversationSummaryIdSchema,
  ProjectIdSchema,
} from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ConversationSummarySchema = z.object({
  id: ConversationSummaryIdSchema,
  projectId: ProjectIdSchema,
  summaryText: z.string().min(1),
  coveredThroughMessageId: ConversationMessageIdSchema,
  tokenCount: z.number().int().nonnegative(),
  createdAt: InstantSchema,
});
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;
