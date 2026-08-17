import type { CreateWorkspaceInput } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  insertWorkspace,
  insertWorkspaceMembership,
  listWorkspaces,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  WorkspaceSchema,
  type UserId,
  type Workspace,
  type WorkspaceMembership,
} from '@foundry/domain';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';

export class WorkspaceService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
  ) {}

  async create(userId: UserId, input: CreateWorkspaceInput): Promise<Workspace> {
    const key = `idem:${userId}:workspace.create:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => WorkspaceSchema.parse(superjson.parse(raw)),
      (value) => superjson.stringify(value),
      async () => {
        return this.sql.begin(async (tx) => {
          const workspace = await insertWorkspace(tx, {
            name: input.name,
            ownerUserId: userId,
          });
          await insertWorkspaceMembership(tx, {
            workspaceId: workspace.id,
            userId,
            role: 'owner',
          });
          return workspace;
        });
      },
    );
  }

  async list(memberships: readonly WorkspaceMembership[]): Promise<Workspace[]> {
    const ids = memberships.map((membership) => membership.workspaceId);
    if (ids.length === 0) {
      return [];
    }
    return withWorkspaceScope(this.sql, ids, async (tx) => listWorkspaces(tx));
  }
}
