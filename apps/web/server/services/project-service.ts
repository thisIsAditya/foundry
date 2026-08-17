import type { CreateProjectInput } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  insertProject,
  listProjectsByWorkspaceId,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  ProjectSchema,
  type Project,
  type UserId,
  type WorkspaceId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';

export class ProjectService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
  ) {}

  async create(
    actor: { userId: UserId; membership: WorkspaceMembership },
    input: CreateProjectInput,
  ): Promise<Project> {
    if (!this.policyService.can(actor.membership, 'project.create')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot create projects in this workspace.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }

    const key = `idem:${actor.userId}:project.create:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => ProjectSchema.parse(superjson.parse(raw)),
      (value) => superjson.stringify(value),
      async () => {
        return withWorkspaceScope(this.sql, [input.workspaceId], async (tx) => {
          return insertProject(tx, {
            workspaceId: input.workspaceId,
            name: input.name,
            ...(input.geography === undefined ? {} : { geography: input.geography }),
            ...(input.objective === undefined ? {} : { founderObjective: input.objective }),
          });
        });
      },
    );
  }

  async list(membership: WorkspaceMembership, workspaceId: WorkspaceId): Promise<Project[]> {
    if (!this.policyService.can(membership, 'project.list')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot list projects in this workspace.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [workspaceId], async (tx) =>
      listProjectsByWorkspaceId(tx, workspaceId),
    );
  }
}
