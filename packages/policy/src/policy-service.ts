import { type WorkspaceMembership, type WorkspaceRole } from '@foundry/domain';

const roleRank: Record<WorkspaceRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export const PolicyActions = [
  'workspace.read',
  'workspace.create',
  'project.list',
  'project.create',
  'project.answer',
  'evidence.read',
  'evidence.upload',
  'provider.read',
  'provider.connect',
  'sprint.read',
  'sprint.run',
] as const;
export type PolicyAction = (typeof PolicyActions)[number];

export function roleAtLeast(actual: WorkspaceRole, minimum: WorkspaceRole): boolean {
  return roleRank[actual] >= roleRank[minimum];
}

export class PolicyService {
  can(membership: WorkspaceMembership | null, action: PolicyAction): boolean {
    if (action === 'workspace.create') {
      return true;
    }
    if (membership === null) {
      return false;
    }
    switch (action) {
      case 'workspace.read':
      case 'project.list':
      case 'evidence.read':
      case 'provider.read':
      case 'sprint.read':
        return roleAtLeast(membership.role, 'viewer');
      case 'project.create':
      case 'project.answer':
      case 'evidence.upload':
      case 'provider.connect':
      case 'sprint.run':
        return roleAtLeast(membership.role, 'member');
    }
  }
}
