import { PackSectionKeySchema, type AgentDefinition } from '@foundry/domain';
import { z } from 'zod';

export const ProposedPackChangeSchema = z.object({
  targetSection: PackSectionKeySchema,
  body: z.record(z.string(), z.unknown()),
});
export type ProposedPackChange = z.infer<typeof ProposedPackChangeSchema>;

export const AgentRunOutputSchema = z.object({
  result: z.string().min(1),
  proposedPackChanges: z.array(ProposedPackChangeSchema),
  evidenceRefs: z.array(z.string()),
  assumptionsChanged: z.array(z.string()),
  unresolvedConflicts: z.array(z.string()),
  confidence: z.string().min(1),
  recommendedNextAction: z.string().min(1),
});
export type AgentRunOutput = z.infer<typeof AgentRunOutputSchema>;

export const CriticOutputSchema = z.object({
  recommendation: z.enum(['GO', 'PIVOT', 'KILL']),
  summary: z.string().min(1),
  instantFailFlags: z.array(z.string()),
  rubricNotes: z.array(z.string()),
});
export type CriticOutput = z.infer<typeof CriticOutputSchema>;

export type RuntimeAgentDefinition = AgentDefinition & {
  modelProfile: string;
  toolAllowlist: string[];
};
