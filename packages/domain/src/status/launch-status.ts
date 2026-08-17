import { z } from 'zod';

export const PackSectionKeys = ['mvbp', 'gtm', 'org_cost', 'legal', 'launch'] as const;
export const PackSectionKeySchema = z.enum(PackSectionKeys);
export type PackSectionKey = z.infer<typeof PackSectionKeySchema>;

export const ApprovalActionTypes = [
  'landing.publish',
  'payment_link.send',
  'email.send',
  'whatsapp.broadcast',
  'calendar.create_event',
  'crm.outbound',
  'growth.publish',
  'ads.spend',
  'filing.submit',
] as const;
export const ApprovalActionTypeSchema = z.enum(ApprovalActionTypes);
export type ApprovalActionType = z.infer<typeof ApprovalActionTypeSchema>;

export const NotificationJobKinds = [
  'execute_approval',
  'weekly_digest',
  'compliance_reminder',
  'research_completed',
  'job_needs_founder',
  'revision_ready',
  'job_failed_or_blocked',
  'founder_task_due',
  'score_changed_materially',
  'budget_threshold_reached',
] as const;
export const NotificationJobKindSchema = z.enum(NotificationJobKinds);
export type NotificationJobKind = z.infer<typeof NotificationJobKindSchema>;
