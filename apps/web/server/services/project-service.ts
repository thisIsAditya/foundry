import type { CreateProjectInput } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  getProjectById,
  insertProject,
  listProjectsByWorkspaceId,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import type { Project, UserId, WorkspaceId, WorkspaceMembership } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';
import type { JourneyService } from './journey-service';
import { isUploadInboxProject } from './upload-inbox';

export type ProjectRuntimeDeps = {
  journeyService?: JourneyService;
};

export class ProjectService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
    private readonly runtime: ProjectRuntimeDeps,
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
      (raw) => superjson.parse(raw) as Project,
      (value) => superjson.stringify(value),
      async () => {
        const project = await withWorkspaceScope(this.sql, [input.workspaceId], async (tx) => {
          const created = await insertProject(tx, {
            workspaceId: input.workspaceId,
            name: input.name,
            ...(input.geography === undefined ? {} : { geography: input.geography }),
            ...(input.objective === undefined ? {} : { founderObjective: input.objective }),
          });
          await this.runtime.journeyService?.bootstrap(tx, {
            project: created,
            actorId: actor.userId,
            ideaText: input.founderPitch ?? '',
            geography: input.geography ?? created.geography,
            objective: input.objective ?? created.founderObjective,
            constraints: input.constraints ?? null,
            urgency: input.urgency ?? null,
            customerHint: input.customerHint ?? null,
          });
          return (await getProjectById(tx, created.id)) ?? created;
        });
        return project;
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
      (await listProjectsByWorkspaceId(tx, workspaceId)).filter(
        (project) => !isUploadInboxProject(project),
      ),
    );
  }
}
