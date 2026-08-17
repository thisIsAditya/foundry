import { z } from 'zod';

export const BillingFrequencies = ['monthly', 'annual', 'one_time', 'usage'] as const;
export const BillingFrequencySchema = z.enum(BillingFrequencies);
export type BillingFrequency = z.infer<typeof BillingFrequencySchema>;

export const ArtifactTypes = [
  'company_pack',
  'lean_canvas',
  'business_model_canvas',
  'evidence_report',
  'one_page_brief',
  'slide_outline',
  'market_economics_workbook',
  'mvbp_prd',
  'first_100_plan',
  'launch_checklist',
  'operating_playbook',
] as const;
export const ArtifactTypeSchema = z.enum(ArtifactTypes);
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

export const ArtifactFormats = ['markdown', 'html', 'pdf', 'xlsx', 'json'] as const;
export const ArtifactFormatSchema = z.enum(ArtifactFormats);
export type ArtifactFormat = z.infer<typeof ArtifactFormatSchema>;

export const ArtifactDependencyKinds = [
  'money_rules',
  'market_model',
  'unit_economics_model',
  'beachhead',
  'interview',
  'wtp_event',
  'pack_revision',
] as const;
export const ArtifactDependencyKindSchema = z.enum(ArtifactDependencyKinds);
export type ArtifactDependencyKind = z.infer<typeof ArtifactDependencyKindSchema>;
