import type { ConnectIntegrationInput, IntegrationSummary } from '@foundry/api-contracts';
import type { SecretBox } from '@foundry/agent-runtime';
import { limits } from '@foundry/config/limits';
import {
  insertIntegrationConnection,
  listIntegrationConnectionsByWorkspaceId,
  revokeIntegrationConnection,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  IntegrationConnectionIdSchema,
  type UserId,
  type WorkspaceId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';

function toSummary(row: {
  id: IntegrationSummary['id'];
  workspaceId: IntegrationSummary['workspaceId'];
  provider: IntegrationSummary['provider'];
  revokedAt: Date | null;
  createdAt: Date;
}): IntegrationSummary {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    provider: row.provider,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    connected: row.revokedAt === null,
  };
}

export class IntegrationService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
    private readonly secretBox: SecretBox,
  ) {}

  async list(
    membership: WorkspaceMembership,
    workspaceId: WorkspaceId,
  ): Promise<IntegrationSummary[]> {
    if (!this.policyService.can(membership, 'integration.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot list integrations.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const rows = await withWorkspaceScope(this.sql, [workspaceId], async (tx) =>
      listIntegrationConnectionsByWorkspaceId(tx, workspaceId),
    );
    return rows.map((row) =>
      toSummary({
        id: row.id,
        workspaceId: row.workspaceId,
        provider: row.provider,
        revokedAt: row.revokedAt,
        createdAt: row.createdAt,
      }),
    );
  }

  async connect(
    actor: { userId: UserId; membership: WorkspaceMembership },
    input: ConnectIntegrationInput,
  ): Promise<IntegrationSummary> {
    if (!this.policyService.can(actor.membership, 'integration.connect')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot connect integrations.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:integration.connect:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as IntegrationSummary,
      (value) => superjson.stringify(value),
      async () => {
        const created = await withWorkspaceScope(this.sql, [input.workspaceId], async (tx) =>
          insertIntegrationConnection(tx, {
            workspaceId: input.workspaceId,
            provider: input.provider,
            authRefEncrypted: this.secretBox.encrypt(input.credential),
            ...(input.scope === undefined ? {} : { scope: input.scope }),
          }),
        );
        return toSummary({
          id: created.id,
          workspaceId: created.workspaceId,
          provider: created.provider,
          revokedAt: created.revokedAt,
          createdAt: created.createdAt,
        });
      },
    );
  }

  async revoke(
    actor: { userId: UserId; membership: WorkspaceMembership },
    workspaceId: WorkspaceId,
    integrationId: string,
    idempotencyKey: string,
  ): Promise<IntegrationSummary> {
    if (!this.policyService.can(actor.membership, 'integration.connect')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot revoke integrations.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const id = IntegrationConnectionIdSchema.parse(integrationId);
    const key = `idem:${actor.userId}:integration.revoke:${idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as IntegrationSummary,
      (value) => superjson.stringify(value),
      async () => {
        const updated = await withWorkspaceScope(this.sql, [workspaceId], async (tx) =>
          revokeIntegrationConnection(tx, id),
        );
        return toSummary({
          id: updated.id,
          workspaceId: updated.workspaceId,
          provider: updated.provider,
          revokedAt: updated.revokedAt,
          createdAt: updated.createdAt,
        });
      },
    );
  }
}
