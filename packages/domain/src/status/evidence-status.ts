import { z } from 'zod';

export const SourceKinds = ['upload', 'url', 'interview_note'] as const;
export const SourceKindSchema = z.enum(SourceKinds);
export type SourceKind = z.infer<typeof SourceKindSchema>;

export const SourceStatuses = [
  'pending',
  'uploaded',
  'processing',
  'ready',
  'failed',
  'tombstoned',
] as const;
export const SourceStatusSchema = z.enum(SourceStatuses);
export type SourceStatus = z.infer<typeof SourceStatusSchema>;

export const ContentBlockTypes = ['text', 'table', 'image', 'structured'] as const;
export const ContentBlockTypeSchema = z.enum(ContentBlockTypes);
export type ContentBlockType = z.infer<typeof ContentBlockTypeSchema>;

export const InterviewParticipantTypes = ['non_friend', 'friend', 'known_contact'] as const;
export const InterviewParticipantTypeSchema = z.enum(InterviewParticipantTypes);
export type InterviewParticipantType = z.infer<typeof InterviewParticipantTypeSchema>;

export const WtpParticipantClasses = ['friend', 'known_contact', 'independent_prospect'] as const;
export const WtpParticipantClassSchema = z.enum(WtpParticipantClasses);
export type WtpParticipantClass = z.infer<typeof WtpParticipantClassSchema>;

export const WtpInstruments = ['paid_pilot', 'invoice', 'deposit', 'loi', 'concierge'] as const;
export const WtpInstrumentSchema = z.enum(WtpInstruments);
export type WtpInstrument = z.infer<typeof WtpInstrumentSchema>;

export const ExperimentStatuses = ['planned'] as const;
export const ExperimentStatusSchema = z.enum(ExperimentStatuses);
export type ExperimentStatus = z.infer<typeof ExperimentStatusSchema>;

export const DataClassifications = ['public', 'internal', 'confidential', 'restricted'] as const;
export const DataClassificationSchema = z.enum(DataClassifications);
export type DataClassification = z.infer<typeof DataClassificationSchema>;
