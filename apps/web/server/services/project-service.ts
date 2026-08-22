import type { CreateProjectInput } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  getEvidenceItemById,
  getProjectById,
  insertProject,
  listProjectsByWorkspaceId,
  updateEvidenceItemProjectId,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import type { Project, UserId, WorkspaceId, WorkspaceMembership } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';
import type { InitialDraftService } from './initial-draft-service';
import type { JourneyService } from './journey-service';
import { isUploadInboxProject } from './upload-inbox';

export type ProjectRuntimeDeps = {
  initialDraftService?: InitialDraftService;
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
            ideaText: input.founderPitch ?? created.name,
            geography: input.geography ?? created.geography,
            objective: input.objective ?? created.founderObjective,
            constraints: input.constraints ?? null,
            urgency: input.urgency ?? null,
            customerHint: input.customerHint ?? null,
          });
          for (const evidenceId of input.attachmentIds ?? []) {
            const evidence = await getEvidenceItemById(tx, evidenceId);
            if (evidence === null) {
              continue;
            }
            const owner = await getProjectById(tx, evidence.projectId);
            if (owner?.workspaceId === created.workspaceId) {
              await updateEvidenceItemProjectId(tx, evidenceId, created.id);
            }
          }
          return (await getProjectById(tx, created.id)) ?? created;
        });
        await this.runtime.initialDraftService?.generate({
          userId: actor.userId,
          membership: actor.membership,
          project,
          ...(input.founderPitch === undefined ? {} : { founderPitch: input.founderPitch }),
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
