import type { CreateWorkspaceInput } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  getWorkspaceById,
  insertWorkspace,
  insertWorkspaceMembership,
  listWorkspaceMembershipsByUserId,
  listWorkspaces,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  WorkspaceSchema,
  type UserId,
  type Workspace,
  type WorkspaceId,
  type WorkspaceMembership,
} from '@foundry/domain';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';

const DEFAULT_WORKSPACE_IDEMPOTENCY_KEY = '00000000-0000-4000-8000-000000000001';

export class WorkspaceService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
  ) {}

  async getById(workspaceId: WorkspaceId): Promise<Workspace | null> {
    return getWorkspaceById(this.sql, workspaceId);
  }

  async create(userId: UserId, input: CreateWorkspaceInput): Promise<Workspace> {
    const key = `idem:${userId}:workspace.create:${input.idempotencyKey}`;
    const workspace = await withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => WorkspaceSchema.parse(superjson.parse(raw)),
      (value) => superjson.stringify(value),
      async () => {
        return this.sql.begin(async (tx) => {
          const created = await insertWorkspace(tx, {
            name: input.name,
            ownerUserId: userId,
          });
          await insertWorkspaceMembership(tx, {
            workspaceId: created.id,
            userId,
            role: 'owner',
          });
          return created;
        });
      },
    );
    return workspace;
  }

  async ensureDefaultWorkspace(userId: UserId): Promise<Workspace> {
    const existing = await listWorkspaceMembershipsByUserId(this.sql, userId);
    const membership = existing[0];
    if (membership !== undefined) {
      const workspace = await this.getById(membership.workspaceId);
      if (workspace !== null) {
        return workspace;
      }
    }
    return this.create(userId, {
      name: 'Your workspace',
      idempotencyKey: DEFAULT_WORKSPACE_IDEMPOTENCY_KEY,
    });
  }

  async list(memberships: readonly WorkspaceMembership[]): Promise<Workspace[]> {
    const ids = memberships.map((membership) => membership.workspaceId);
    if (ids.length === 0) {
      return [];
    }
    return withWorkspaceScope(this.sql, ids, async (tx) => listWorkspaces(tx));
  }
}
