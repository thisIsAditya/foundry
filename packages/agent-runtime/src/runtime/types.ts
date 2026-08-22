import {
  CofounderInteractionTypeSchema,
  JourneyStageSchema,
  RecordSectionKeySchema,
} from '@foundry/domain';
import { z } from 'zod';

import type { RuntimeCapabilityPort } from './capability-port.js';

export const CofounderRuntimeActorSchema = z.object({
  workspaceId: z.string().uuid(),
  ventureId: z.string().uuid(),
  userId: z.string().uuid(),
});
export type CofounderRuntimeActor = z.infer<typeof CofounderRuntimeActorSchema>;

const ReferenceSchema = z.object({ kind: z.string().min(1), id: z.string().min(1) });

export const CofounderContextEnvelopeSchema = z.object({
  actor: CofounderRuntimeActorSchema,
  currentStage: JourneyStageSchema,
  currentObjective: z.string(),
  acceptedRecord: z.array(
    z.object({
      id: z.string().uuid().optional(),
      section: RecordSectionKeySchema,
      status: z.string(),
      provenance: z.string(),
      summary: z.string(),
      versionId: z.string().uuid().nullable().optional(),
      stale: z.boolean().optional(),
    }),
  ),
  pendingProposals: z.array(z.object({ id: z.string(), rationale: z.string() })),
  activeSteps: z.array(z.object({ id: z.string(), objective: z.string(), status: z.string() })),
  deferredSteps: z
    .array(z.object({ id: z.string(), objective: z.string(), status: z.string() }))
    .default([]),
  blockedSteps: z
    .array(z.object({ id: z.string(), objective: z.string(), status: z.string() }))
    .default([]),
  readiness: z.array(z.object({ section: z.string(), kind: z.string(), explanation: z.string() })),
  evidence: z
    .array(
      z.object({
        id: z.string(),
        summary: z.string(),
        provenanceKind: z.string(),
      }),
    )
    .default([]),
  interviews: z
    .array(
      z.object({
        id: z.string(),
        participantType: z.string(),
        consentGiven: z.boolean(),
      }),
    )
    .default([]),
  quotes: z
    .array(z.object({ id: z.string(), interviewId: z.string().nullable(), text: z.string() }))
    .default([]),
  decisions: z.array(z.object({ id: z.string(), statement: z.string() })).default([]),
  assumptions: z.array(z.object({ id: z.string(), statement: z.string() })).default([]),
  relations: z
    .array(
      z.object({
        recordItemId: z.string(),
        targetKind: z.string(),
        targetId: z.string(),
        relationType: z.string(),
      }),
    )
    .default([]),
  memory: z
    .object({
      id: z.string(),
      kind: z.string(),
      body: z.string(),
      stale: z.boolean(),
    })
    .nullable()
    .default(null),
  recentMessages: z.array(
    z.object({
      actor: z.string(),
      text: z.string(),
      interactionType: CofounderInteractionTypeSchema.optional(),
      recommendation: z.string().optional(),
      proposalId: z.string().optional(),
    }),
  ),
  retrieval: z
    .array(
      z.object({
        id: z.string(),
        kind: z.string(),
        excerpt: z.string(),
        citationId: z.string().optional(),
      }),
    )
    .default([]),
  omitted: z.array(z.string()),
  selectionRationale: z
    .string()
    .default('Selected current journey, record, and recent founder-visible context.'),
  contextChars: z.number().int().nonnegative().default(0),
  correlationId: z.string(),
  allowedCapabilities: z.array(z.string()),
  capabilityBudget: z
    .object({
      maxInvocations: z.number().int().positive(),
      remaining: z.number().int().nonnegative(),
    })
    .default({ maxInvocations: 8, remaining: 8 }),
});
export type CofounderContextEnvelope = z.infer<typeof CofounderContextEnvelopeSchema>;
/** @deprecated Use CofounderContextEnvelope. Kept as a compatible alias. */
export const CofounderContextPacketSchema = CofounderContextEnvelopeSchema;
export type CofounderContextPacket = CofounderContextEnvelope;

export const CofounderFactSchema = z.object({
  statement: z.string().min(1),
  references: z.array(ReferenceSchema).min(1),
});
export type CofounderFact = z.infer<typeof CofounderFactSchema>;

export const CofounderArtifactSchema = z.object({
  title: z.string().min(1),
  kind: z.enum(['survey', 'interview_guide', 'experiment_draft', 'note']),
  content: z.string().min(1),
});
export type CofounderArtifact = z.infer<typeof CofounderArtifactSchema>;

export const CofounderRuntimeResultSchema = z.object({
  explanation: z.string().min(1),
  interactionType: CofounderInteractionTypeSchema,
  references: z.array(ReferenceSchema),
  facts: z.array(CofounderFactSchema).default([]),
  interpretation: z.string().default(''),
  assumptions: z.array(z.string()).default([]),
  recommendation: z.string().optional(),
  proposalDraft: z
    .object({
      rationale: z.string().min(1),
      uncertainty: z.string().optional(),
      changes: z.array(
        z.object({
          section: RecordSectionKeySchema,
          itemKey: z.string().optional(),
          afterPayload: z.unknown(),
          rationale: z.string().optional(),
          evidenceRefs: z.array(z.string().min(1)).default([]),
        }),
      ),
    })
    .optional(),
  suggestedSteps: z
    .array(
      z.object({
        stage: JourneyStageSchema,
        objective: z.string().min(1),
        whyNow: z.string().min(1),
      }),
    )
    .optional(),
  artifact: CofounderArtifactSchema.optional(),
  uncertainty: z.string(),
  blockedConditions: z.array(z.string()),
  activity: z.string().min(1),
});
export type CofounderRuntimeResult = z.infer<typeof CofounderRuntimeResultSchema>;

export type CofounderRuntimeInput = {
  operationId: string;
  actor: CofounderRuntimeActor;
  contextPacket: CofounderContextPacket;
  founderRequest: string;
  schemaVersion: string;
  capabilityManifest: readonly string[];
  timeoutMs: number;
  abortSignal?: AbortSignal;
  capabilities?: RuntimeCapabilityPort;
  capabilityToken?: string;
  capabilityInvokeUrl?: string;
};

export type CofounderRuntime = {
  run(input: CofounderRuntimeInput): Promise<CofounderRuntimeResult>;
};
