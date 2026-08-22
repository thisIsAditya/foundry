import type { DeleteProjectMemoryInput, UpsertProjectMemoryInput } from '@foundry/api-contracts';
import {
  getCommandReceipt,
  getProjectMemoryEntryById,
  insertCommandReceipt,
  insertProjectMemoryEntry,
  listActiveProjectMemoryByProjectId,
  supersedeProjectMemoryEntry,
  updateProjectMemoryEntry,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  ProjectMemoryEntryIdSchema,
  type Project,
  type ProjectMemoryEntry,
  type UserId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';

export class MemoryService {
  constructor(
    private readonly sql: PoolSql,
    private readonly policyService: PolicyService,
  ) {}

  async list(actor: {
    membership: WorkspaceMembership;
    project: Project;
  }): Promise<ProjectMemoryEntry[]> {
    if (!this.policyService.can(actor.membership, 'memory.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read project memory.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], (tx) =>
      listActiveProjectMemoryByProjectId(tx, actor.project.id),
    );
  }

  async upsert(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: UpsertProjectMemoryInput,
  ): Promise<ProjectMemoryEntry> {
    if (!this.policyService.can(actor.membership, 'memory.write')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot edit project memory.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const existing = await getCommandReceipt(
        tx,
        actor.userId,
        'memory.upsert',
        input.idempotencyKey,
      );
      if (
        existing !== null &&
        typeof existing === 'object' &&
        existing !== null &&
        'id' in existing
      ) {
        const replayed = await getProjectMemoryEntryById(
          tx,
          ProjectMemoryEntryIdSchema.parse((existing as { id: string }).id),
        );
        if (replayed !== null) {
          return replayed;
        }
      }
      let entry: ProjectMemoryEntry;
      if (input.id === undefined) {
        entry = await insertProjectMemoryEntry(tx, {
          projectId: actor.project.id,
          workspaceId: actor.project.workspaceId,
          kind: input.kind,
          body: input.body,
          sourceKind: 'founder',
          sourceIds: input.sourceIds,
          authorType: 'founder',
          authorId: actor.userId,
        });
      } else {
        const current = await getProjectMemoryEntryById(
          tx,
          ProjectMemoryEntryIdSchema.parse(input.id),
        );
        if (current === null || current.projectId !== actor.project.id) {
          throw new AppError({
            code: 'not_found',
            explanation: 'That memory entry was not found.',
            nextAction: 'Reload Evidence and pick a current memory item.',
          });
        }
        const updated = await updateProjectMemoryEntry(tx, current.id, {
          body: input.body,
          sourceIds: input.sourceIds,
        });
        if (updated === null) {
          throw new AppError({
            code: 'not_found',
            explanation: 'That memory entry can no longer be edited.',
            nextAction: 'It may have been deleted. Add a new memory item instead.',
          });
        }
        entry = updated;
      }
      await insertCommandReceipt(tx, {
        workspaceId: actor.project.workspaceId,
        projectId: actor.project.id,
        actorId: actor.userId,
        command: 'memory.upsert',
        idempotencyKey: input.idempotencyKey,
        result: { id: entry.id },
      });
      return entry;
    });
  }

  async remove(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: DeleteProjectMemoryInput,
  ): Promise<{ ok: true }> {
    if (!this.policyService.can(actor.membership, 'memory.write')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot delete project memory.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const existing = await getCommandReceipt(
        tx,
        actor.userId,
        'memory.delete',
        input.idempotencyKey,
      );
      if (existing !== null) {
        return { ok: true as const };
      }
      const current = await getProjectMemoryEntryById(
        tx,
        ProjectMemoryEntryIdSchema.parse(input.id),
      );
      if (current === null || current.projectId !== actor.project.id) {
        throw new AppError({
          code: 'not_found',
          explanation: 'That memory entry was not found.',
          nextAction: 'Reload Evidence.',
        });
      }
      await supersedeProjectMemoryEntry(tx, current.id);
      await insertCommandReceipt(tx, {
        workspaceId: actor.project.workspaceId,
        projectId: actor.project.id,
        actorId: actor.userId,
        command: 'memory.delete',
        idempotencyKey: input.idempotencyKey,
        result: { ok: true },
      });
      return { ok: true as const };
    });
  }
}
