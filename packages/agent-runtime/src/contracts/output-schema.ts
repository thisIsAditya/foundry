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

export const CofounderDecisionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('answer'),
    text: z.string().min(1),
  }),
  z.object({
    action: z.literal('start_research'),
    objective: z.string().min(1),
    whyNow: z.string().min(1),
    text: z.string().min(1),
  }),
  z.object({
    action: z.literal('propose_draft_revision'),
    objective: z.string().min(1),
    text: z.string().min(1),
  }),
  z.object({
    action: z.literal('create_founder_task'),
    title: z.string().min(1),
    explanation: z.string().min(1),
    text: z.string().min(1),
  }),
  z.object({
    action: z.literal('create_job'),
    objective: z.string().min(1),
    jobKind: z.enum(['research', 'draft', 'analysis', 'clarification', 'synthesis']),
    whyNow: z.string().min(1),
    text: z.string().min(1),
  }),
  z.object({
    action: z.literal('ask_targeted_question'),
    question: z.string().min(1),
    whyNotResearchable: z.string().min(1),
    text: z.string().min(1),
  }),
]);
export type CofounderDecision = z.infer<typeof CofounderDecisionSchema>;

export const InitialDraftSectionSchema = z.object({
  key: z.string().min(1),
  provenance: z.enum(['founder_input', 'assumption', 'open_question', 'not_applicable']),
  summary: z.string().min(1),
  reason: z.string().min(1).optional(),
});
export type InitialDraftSection = z.infer<typeof InitialDraftSectionSchema>;

export const InitialDraftSchema = z.object({
  sections: z.array(InitialDraftSectionSchema),
  founderMessage: z.string().min(1),
});
export type InitialDraft = z.infer<typeof InitialDraftSchema>;

export type RuntimeAgentDefinition = AgentDefinition & {
  modelProfile: string;
  toolAllowlist: string[];
};
