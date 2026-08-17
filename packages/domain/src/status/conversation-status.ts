import { z } from 'zod';

export const ConversationActors = ['founder', 'co_founder', 'system'] as const;
export const ConversationActorSchema = z.enum(ConversationActors);
export type ConversationActor = z.infer<typeof ConversationActorSchema>;

export const ConversationBlockKinds = [
  'concise_answer',
  'cited_finding',
  'assumption_card',
  'proposed_plan_change',
  'research_plan',
  'founder_task',
  'job_request',
  'draft_action',
  'decision_card',
  'blocker',
] as const;
export const ConversationBlockKindSchema = z.enum(ConversationBlockKinds);
export type ConversationBlockKind = z.infer<typeof ConversationBlockKindSchema>;

export const ConversationReferenceKinds = [
  'job',
  'founder_task',
  'evidence',
  'section',
  'revision',
  'decision',
] as const;
export const ConversationReferenceKindSchema = z.enum(ConversationReferenceKinds);
export type ConversationReferenceKind = z.infer<typeof ConversationReferenceKindSchema>;

export const ConversationVisibilities = ['founder_visible', 'internal'] as const;
export const ConversationVisibilitySchema = z.enum(ConversationVisibilities);
export type ConversationVisibility = z.infer<typeof ConversationVisibilitySchema>;

export const ResearchExtractionMethods = [
  'web_search',
  'web_fetch',
  'company_profile',
  'academic',
  'market_report',
] as const;
export const ResearchExtractionMethodSchema = z.enum(ResearchExtractionMethods);
export type ResearchExtractionMethod = z.infer<typeof ResearchExtractionMethodSchema>;

export const SourceCategories = [
  'web',
  'company',
  'academic',
  'market_report',
  'upload',
  'interview_note',
] as const;
export const SourceCategorySchema = z.enum(SourceCategories);
export type SourceCategory = z.infer<typeof SourceCategorySchema>;
