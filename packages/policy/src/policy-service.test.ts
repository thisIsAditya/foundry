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
});
