import type { ConnectProviderInput, ProviderConnectionSummary } from '@foundry/api-contracts';
import {
  probeProviderCapabilities,
  type ProviderSecrets,
  type SecretBox,
} from '@foundry/agent-runtime';
import { limits } from '@foundry/config/limits';
import {
  insertProviderConnection,
  listProviderConnectionsByWorkspaceId,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  ProviderConnectionIdSchema,
  type UserId,
  type WorkspaceId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import { randomUUID } from 'node:crypto';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';

export type CapabilityProbe = typeof probeProviderCapabilities;

function toSummary(row: {
  id: ProviderConnectionSummary['id'];
  workspaceId: ProviderConnectionSummary['workspaceId'];
  providerFamily: ProviderConnectionSummary['providerFamily'];
  authMode: ProviderConnectionSummary['authMode'];
  endpointOrRegion: string | null;
  healthStatus: string;
  lastValidatedAt: Date | null;
  createdAt: Date;
  credentialRefEncrypted: string | null;
}): ProviderConnectionSummary {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    providerFamily: row.providerFamily,
    authMode: row.authMode,
    endpointOrRegion: row.endpointOrRegion,
    healthStatus: row.healthStatus,
    lastValidatedAt: row.lastValidatedAt,
    createdAt: row.createdAt,
    hasCredential: row.credentialRefEncrypted !== null || row.authMode === 'platform_env',
  };
}

export class ProviderService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
    private readonly secretBox: SecretBox,
    private readonly secrets: ProviderSecrets,
    probe: CapabilityProbe = probeProviderCapabilities,
  ) {
    this.probe = probe;
  }

  private readonly probe: CapabilityProbe;

  async listConnections(
    membership: WorkspaceMembership,
    workspaceId: WorkspaceId,
  ): Promise<ProviderConnectionSummary[]> {
    if (!this.policyService.can(membership, 'provider.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot list provider connections.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const rows = await withWorkspaceScope(this.sql, [workspaceId], async (tx) =>
      listProviderConnectionsByWorkspaceId(tx, workspaceId),
    );
    return rows.map(toSummary);
  }

  async connect(
    actor: { userId: UserId; membership: WorkspaceMembership },
    input: ConnectProviderInput,
  ): Promise<ProviderConnectionSummary> {
    if (!this.policyService.can(actor.membership, 'provider.connect')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot connect a model provider.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    if (
      input.authMode === 'api_key' &&
      (input.credential === undefined || input.credential.length === 0)
    ) {
      throw new AppError({
        code: 'invalid_input',
        explanation: 'An API key is required for this auth mode.',
        nextAction: 'Paste the provider API key and retry.',
      });
    }

    const key = `idem:${actor.userId}:provider.connect:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as ProviderConnectionSummary,
      (value) => superjson.stringify(value),
      async () => {
        const encrypted =
          input.credential === undefined ? null : this.secretBox.encrypt(input.credential);
        const draft = {
          workspaceId: input.workspaceId,
          userId: actor.userId,
          providerFamily: input.family,
          authMode: input.authMode,
          credentialRefEncrypted: encrypted,
          endpointOrRegion: input.endpointOrRegion ?? null,
          allowedModels: input.modelId === undefined ? null : [input.modelId],
          healthStatus: 'unknown' as const,
        };
        const modelId = input.modelId ?? limits.provider.defaultAnthropicProbeModel;
        await this.probe(
          {
            id: ProviderConnectionIdSchema.parse(randomUUID()),
            workspaceId: input.workspaceId,
            userId: actor.userId,
            providerFamily: input.family,
            authMode: input.authMode,
            credentialRefEncrypted: encrypted,
            endpointOrRegion: input.endpointOrRegion ?? null,
            allowedModels: input.modelId === undefined ? null : [input.modelId],
            allowedDataClassifications: null,
            fallbackPolicy: null,
            spendLimitUsd: null,
            healthStatus: 'unknown',
            lastValidatedAt: null,
            createdAt: new Date(),
          },
          modelId,
          this.secrets,
          this.secretBox,
        );
        const saved = await withWorkspaceScope(
          this.sql,
          [input.workspaceId],
          async (tx) =>
            insertProviderConnection(tx, {
              ...draft,
              healthStatus: 'ok',
              lastValidatedAt: new Date(),
            }),
          actor.userId,
        );
        return toSummary(saved);
      },
    );
  }
}
