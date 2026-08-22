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

export const CofounderContextPacketSchema = z.object({
  actor: CofounderRuntimeActorSchema,
  currentStage: JourneyStageSchema,
  currentObjective: z.string(),
  acceptedRecord: z.array(
    z.object({
      section: RecordSectionKeySchema,
      status: z.string(),
      provenance: z.string(),
      summary: z.string(),
    }),
  ),
  pendingProposals: z.array(z.object({ id: z.string(), rationale: z.string() })),
  activeSteps: z.array(z.object({ id: z.string(), objective: z.string(), status: z.string() })),
  readiness: z.array(z.object({ section: z.string(), kind: z.string(), explanation: z.string() })),
  recentMessages: z.array(z.object({ actor: z.string(), text: z.string() })),
  omitted: z.array(z.string()),
  correlationId: z.string(),
  allowedCapabilities: z.array(z.string()),
});
export type CofounderContextPacket = z.infer<typeof CofounderContextPacketSchema>;

export const CofounderRuntimeResultSchema = z.object({
  explanation: z.string().min(1),
  interactionType: CofounderInteractionTypeSchema,
  references: z.array(z.object({ kind: z.string(), id: z.string() })),
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
};

export type CofounderRuntime = {
  run(input: CofounderRuntimeInput): Promise<CofounderRuntimeResult>;
};

export const COFOUNDER_RUNTIME_INSTRUCTIONS_V1 = `You are one application-controlled co-founder. Work from the supplied business record, journey stage, and evidence. Choose exactly one interaction type: ask, inform, recommend, generate, review, or change. Distinguish founder-approved facts from unverified assumptions and from your interpretation. Never invent customers, prices, quotes, market sizes, or validation. Never claim an accepted record write, stage change, or external side effect. If you propose a record change, return it as proposalDraft for founder review. End with a clear next step.`;
