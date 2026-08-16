import { z } from 'zod';

export const JourneyPhases = [
  'diagnose',
  'problem',
  'evidence',
  'market_and_competition',
  'model_and_pricing',
  'willingness_to_pay',
  'product',
  'build_and_launch',
  'operate',
] as const;

export const JourneyPhaseSchema = z.enum(JourneyPhases);
export type JourneyPhase = z.infer<typeof JourneyPhaseSchema>;

export const FounderObjectives = [
  'bootstrap',
  'venture',
  'grant',
  'loan',
  'lifestyle',
  'undecided',
] as const;

export const FounderObjectiveSchema = z.enum(FounderObjectives);
export type FounderObjective = z.infer<typeof FounderObjectiveSchema>;

export const PackRevisionStatuses = ['draft', 'accepted', 'rejected', 'superseded'] as const;
export const PackRevisionStatusSchema = z.enum(PackRevisionStatuses);
export type PackRevisionStatus = z.infer<typeof PackRevisionStatusSchema>;

export const ActorTypes = ['founder', 'agent', 'system'] as const;
export const ActorTypeSchema = z.enum(ActorTypes);
export type ActorType = z.infer<typeof ActorTypeSchema>;
