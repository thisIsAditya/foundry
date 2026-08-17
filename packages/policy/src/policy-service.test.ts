import { describe, expect, it } from 'vitest';

import { PolicyService } from './policy-service.js';
import type { WorkspaceMembership } from '@foundry/domain';
import { UserIdSchema, WorkspaceIdSchema, WorkspaceMembershipIdSchema } from '@foundry/domain';

function membership(role: WorkspaceMembership['role']): WorkspaceMembership {
  return {
    id: WorkspaceMembershipIdSchema.parse('11111111-1111-4111-8111-111111111111'),
    workspaceId: WorkspaceIdSchema.parse('22222222-2222-4222-8222-222222222222'),
    userId: UserIdSchema.parse('33333333-3333-4333-8333-333333333333'),
    role,
    invitedBy: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

describe('PolicyService', () => {
  const policy = new PolicyService();

  it('lets any authenticated caller create a workspace', () => {
    expect(policy.can(null, 'workspace.create')).toBe(true);
  });

  it('rejects missing memberships for workspace reads', () => {
    expect(policy.can(null, 'workspace.read')).toBe(false);
  });

  it('allows viewers to list projects but not create them', () => {
    const viewer = membership('viewer');
    expect(policy.can(viewer, 'project.list')).toBe(true);
    expect(policy.can(viewer, 'project.create')).toBe(false);
  });

  it('allows members to create projects', () => {
    expect(policy.can(membership('member'), 'project.create')).toBe(true);
  });

  it('allows viewers to read evidence but not upload', () => {
    const viewer = membership('viewer');
    expect(policy.can(viewer, 'evidence.read')).toBe(true);
    expect(policy.can(viewer, 'evidence.upload')).toBe(false);
  });

  it('allows members to upload evidence', () => {
    expect(policy.can(membership('member'), 'evidence.upload')).toBe(true);
  });

  it('allows members to connect providers and run sprints', () => {
    const member = membership('member');
    expect(policy.can(member, 'provider.connect')).toBe(true);
    expect(policy.can(member, 'sprint.run')).toBe(true);
    expect(policy.can(member, 'project.answer')).toBe(true);
    expect(policy.can(membership('viewer'), 'provider.connect')).toBe(false);
    expect(policy.can(membership('viewer'), 'sprint.read')).toBe(true);
  });

  it('lets professional reviewers comment without running sprints', () => {
    const reviewer = membership('reviewer');
    expect(policy.can(reviewer, 'project.answer')).toBe(true);
    expect(policy.can(reviewer, 'sprint.run')).toBe(false);
    expect(policy.can(reviewer, 'member.manage')).toBe(false);
  });

  describe('filterTools', () => {
    const tools = {
      market_calculator: 'market',
      'payment_link.draft': 'payment',
      'filing.submit': 'filing',
      unlisted_tool: 'unlisted',
    };
    const riskClasses = {
      market_calculator: 'compute',
      'payment_link.draft': 'draft',
      'filing.submit': 'forbidden',
    } as const;

    it('keeps only allowlisted tools at or below the max risk class', () => {
      const filtered = policy.filterTools(tools, riskClasses, {
        allowlist: ['market_calculator', 'payment_link.draft', 'filing.submit', 'unlisted_tool'],
        maxRiskClass: 'compute',
      });
      expect(filtered).toEqual({ market_calculator: 'market' });
    });

    it('allows draft tools once the risk ceiling is raised', () => {
      const filtered = policy.filterTools(tools, riskClasses, {
        allowlist: ['market_calculator', 'payment_link.draft'],
        maxRiskClass: 'draft',
      });
      expect(filtered).toEqual({ market_calculator: 'market', 'payment_link.draft': 'payment' });
    });

    it('never returns a forbidden tool regardless of the ceiling', () => {
      const filtered = policy.filterTools(tools, riskClasses, {
        allowlist: ['filing.submit'],
        maxRiskClass: 'forbidden',
      });
      expect(filtered).toEqual({});
    });

    it('drops tools missing from the allowlist even if classified', () => {
      const filtered = policy.filterTools(tools, riskClasses, {
        allowlist: [],
        maxRiskClass: 'forbidden',
      });
      expect(filtered).toEqual({});
    });
  });
});
