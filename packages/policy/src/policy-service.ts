import { type RiskClass, type WorkspaceMembership, type WorkspaceRole } from '@foundry/domain';

const riskRank: Record<RiskClass, number> = {
  read: 0,
  compute: 1,
  draft: 2,
  side_effect: 3,
  forbidden: 4,
};

const roleRank: Record<WorkspaceRole, number> = {
  viewer: 0,
  reviewer: 0,
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
  'money.read',
  'money.write',
  'artifact.read',
  'artifact.generate',
  'approval.read',
  'approval.decide',
  'decision.record',
  'integration.read',
  'integration.connect',
  'metric.read',
  'metric.write',
  'member.manage',
  'journey.read',
  'journey.write',
  'record.read',
  'record.accept',
  'proposal.read',
  'proposal.review',
  'cofounder.respond',
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
      case 'money.read':
      case 'artifact.read':
      case 'approval.read':
      case 'integration.read':
      case 'metric.read':
      case 'journey.read':
      case 'record.read':
      case 'proposal.read':
        return roleAtLeast(membership.role, 'viewer');
      case 'project.create':
      case 'evidence.upload':
      case 'provider.connect':
      case 'sprint.run':
      case 'money.write':
      case 'artifact.generate':
      case 'approval.decide':
      case 'decision.record':
      case 'integration.connect':
      case 'metric.write':
      case 'journey.write':
      case 'cofounder.respond':
        return roleAtLeast(membership.role, 'member');
      case 'project.answer':
      case 'proposal.review':
      case 'record.accept':
        return membership.role === 'reviewer' || roleAtLeast(membership.role, 'member');
      case 'member.manage':
        return roleAtLeast(membership.role, 'admin');
    }
  }

  /**
   * Narrows a tool map to the contract allowlist, capped by a maximum risk class
   * (08 §11, plan §Slice 2). Unknown or forbidden tools are always dropped.
   */
  filterTools<T>(
    tools: Record<string, T>,
    riskClasses: Record<string, RiskClass>,
    options: { allowlist: readonly string[]; maxRiskClass: RiskClass },
  ): Record<string, T> {
    const allowed = new Set(options.allowlist);
    const maxRank = riskRank[options.maxRiskClass];
    const result: Record<string, T> = {};
    for (const [name, definition] of Object.entries(tools)) {
      if (!allowed.has(name)) {
        continue;
      }
      const riskClass = riskClasses[name];
      if (riskClass === undefined || riskClass === 'forbidden') {
        continue;
      }
      if (riskRank[riskClass] > maxRank) {
        continue;
      }
      result[name] = definition;
    }
    return result;
  }
}
