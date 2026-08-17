import type { InviteMemberInput, UpdateMemberRoleInput } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  getUserByEmail,
  insertWorkspaceMembership,
  listWorkspaceMembershipsByWorkspaceId,
  updateWorkspaceMembershipRole,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import type { UserId, WorkspaceId, WorkspaceMembership } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';

export class MemberService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
  ) {}

  async list(
    membership: WorkspaceMembership,
    workspaceId: WorkspaceId,
  ): Promise<WorkspaceMembership[]> {
    if (!this.policyService.can(membership, 'workspace.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot list members.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [workspaceId], async (tx) =>
      listWorkspaceMembershipsByWorkspaceId(tx, workspaceId),
    );
  }

  async invite(
    actor: { userId: UserId; membership: WorkspaceMembership },
    input: InviteMemberInput,
  ): Promise<WorkspaceMembership> {
    if (!this.policyService.can(actor.membership, 'member.manage')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot invite members.',
        nextAction: 'Ask a workspace owner or admin.',
      });
    }
    const key = `idem:${actor.userId}:member.invite:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as WorkspaceMembership,
      (value) => superjson.stringify(value),
      async () => {
        const user = await getUserByEmail(this.sql, input.email);
        if (user === null) {
          throw new AppError({
            code: 'not_found',
            explanation: 'No Foundry account exists for that email yet.',
            nextAction: 'Ask the reviewer to sign in once, then invite them.',
          });
        }
        return withWorkspaceScope(this.sql, [input.workspaceId], async (tx) =>
          insertWorkspaceMembership(tx, {
            workspaceId: input.workspaceId,
            userId: user.id,
            role: input.role,
            invitedBy: actor.userId,
          }),
        );
      },
    );
  }

  async updateRole(
    actor: { userId: UserId; membership: WorkspaceMembership },
    input: UpdateMemberRoleInput,
  ): Promise<WorkspaceMembership> {
    if (!this.policyService.can(actor.membership, 'member.manage')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot change member roles.',
        nextAction: 'Ask a workspace owner or admin.',
      });
    }
    const key = `idem:${actor.userId}:member.updateRole:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as WorkspaceMembership,
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [input.workspaceId], async (tx) =>
          updateWorkspaceMembershipRole(tx, input.membershipId, input.role),
        ),
    );
  }
}
