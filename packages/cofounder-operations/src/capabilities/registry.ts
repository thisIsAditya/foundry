import type { PolicyAction } from '@foundry/policy';
import type { RiskClass } from '@foundry/domain';
import { z } from 'zod';

export const CAPABILITY_IDS = [
  'venture.readCurrentState@1',
  'evidence.searchApproved@1',
  'business.calculate@1',
  'material.prepareDraft@1',
  'evidence.createDraft@1',
  'proposal.createDraft@1',
] as const;
export type CapabilityId = (typeof CAPABILITY_IDS)[number];

export type CapabilityDefinition = {
  id: CapabilityId;
  name: string;
  version: string;
  riskClass: RiskClass;
  policyAction: PolicyAction;
  timeoutMs: number;
  maxInvocationsPerOperation: number;
  idempotent: boolean;
};

export const CAPABILITY_REGISTRY: Record<CapabilityId, CapabilityDefinition> = {
  'venture.readCurrentState@1': {
    id: 'venture.readCurrentState@1',
    name: 'venture.readCurrentState',
    version: '1',
    riskClass: 'read',
    policyAction: 'journey.read',
    timeoutMs: 5_000,
    maxInvocationsPerOperation: 8,
    idempotent: true,
  },
  'evidence.searchApproved@1': {
    id: 'evidence.searchApproved@1',
    name: 'evidence.searchApproved',
    version: '1',
    riskClass: 'read',
    policyAction: 'evidence.read',
    timeoutMs: 8_000,
    maxInvocationsPerOperation: 6,
    idempotent: true,
  },
  'business.calculate@1': {
    id: 'business.calculate@1',
    name: 'business.calculate',
    version: '1',
    riskClass: 'compute',
    policyAction: 'cofounder.respond',
    timeoutMs: 2_000,
    maxInvocationsPerOperation: 8,
    idempotent: true,
  },
  'material.prepareDraft@1': {
    id: 'material.prepareDraft@1',
    name: 'material.prepareDraft',
    version: '1',
    riskClass: 'draft',
    policyAction: 'evidence.upload',
    timeoutMs: 8_000,
    maxInvocationsPerOperation: 3,
    idempotent: true,
  },
  'evidence.createDraft@1': {
    id: 'evidence.createDraft@1',
    name: 'evidence.createDraft',
    version: '1',
    riskClass: 'draft',
    policyAction: 'evidence.upload',
    timeoutMs: 12_000,
    maxInvocationsPerOperation: 4,
    idempotent: true,
  },
  'proposal.createDraft@1': {
    id: 'proposal.createDraft@1',
    name: 'proposal.createDraft',
    version: '1',
    riskClass: 'draft',
    policyAction: 'proposal.review',
    timeoutMs: 8_000,
    maxInvocationsPerOperation: 2,
    idempotent: true,
  },
};

export function resolveCapabilityId(name: string): CapabilityId | null {
  if ((CAPABILITY_IDS as readonly string[]).includes(name)) {
    return name as CapabilityId;
  }
  const withVersion = `${name}@1`;
  if ((CAPABILITY_IDS as readonly string[]).includes(withVersion)) {
    return withVersion as CapabilityId;
  }
  return null;
}

export const CalculateInputSchema = z.object({
  operation: z.enum(['add', 'sub', 'mul', 'div']),
  left: z.string().min(1),
  right: z.string().min(1),
  unit: z.string().min(1).optional(),
});

export const SearchApprovedInputSchema = z.object({
  query: z.string().min(1).max(500),
  scope: z.enum(['match', 'intake']).default('match'),
});

export const CreateEvidenceDraftInputSchema = z.object({
  summary: z.string().min(1),
  sourceId: z.string().uuid().optional(),
  url: z.url().optional(),
  excerpt: z.string().min(1).optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export const PrepareMaterialInputSchema = z.object({
  kind: z.enum(['interview_guide', 'experiment_draft', 'note']),
  summary: z.string().min(1),
  idempotencyKey: z.string().uuid().optional(),
});
