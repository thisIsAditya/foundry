import type { AddMcpServerInput } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  probeMcpServer,
  type McpClientFactory,
  type McpToolMeta,
  type SecretBox,
} from '@foundry/agent-runtime';
import {
  countUserMcpServers,
  deleteUserMcpServer,
  getUserMcpServerById,
  insertUserMcpServer,
  listUserMcpServersByUserId,
  updateUserMcpServerEnabled,
  updateUserMcpServerHealth,
  updateUserMcpServerReadOnly,
  withUserScope,
  type PoolSql,
} from '@foundry/db';
import type { UserId, UserMcpServer } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';

export type McpServerSummary = {
  id: UserMcpServer['id'];
  name: string;
  transport: UserMcpServer['transport'];
  url: string;
  enabled: boolean;
  readOnly: boolean;
  healthStatus: UserMcpServer['healthStatus'];
  lastToolCount: number | null;
  lastValidatedAt: Date | null;
  createdAt: Date;
  tools?: McpToolMeta[];
};

function toSummary(row: UserMcpServer, tools?: McpToolMeta[]): McpServerSummary {
  return {
    id: row.id,
    name: row.name,
    transport: row.transport,
    url: row.url,
    enabled: row.enabled,
    readOnly: row.readOnly,
    healthStatus: row.healthStatus,
    lastToolCount: row.lastToolCount,
    lastValidatedAt: row.lastValidatedAt,
    createdAt: row.createdAt,
    ...(tools === undefined ? {} : { tools }),
  };
}

export class McpServerService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly secretBox: SecretBox,
    private readonly allowLoopback: boolean,
    private readonly factory?: McpClientFactory,
  ) {}

  async list(userId: UserId): Promise<McpServerSummary[]> {
    const rows = await withUserScope(this.sql, userId, async (tx) =>
      listUserMcpServersByUserId(tx, userId),
    );
    return rows.map((row) => toSummary(row));
  }

  async add(userId: UserId, input: AddMcpServerInput): Promise<McpServerSummary> {
    const key = `idem:${userId}:mcpServer.add:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as McpServerSummary,
      (value) => superjson.stringify(value),
      async () => {
        const count = await withUserScope(this.sql, userId, async (tx) =>
          countUserMcpServers(tx, userId),
        );
        if (count >= limits.mcp.maxServersPerUser) {
          throw new AppError({
            code: 'invalid_input',
            explanation: `You can register at most ${limits.mcp.maxServersPerUser} MCP servers.`,
            nextAction: 'Remove an unused server and retry.',
          });
        }
        const headersEncrypted =
          input.headerSecret === undefined ? null : this.secretBox.encrypt(input.headerSecret);
        const probe = await probeMcpServer(
          {
            name: input.name,
            transport: input.transport,
            url: input.url,
            headersEncrypted,
            readOnly: input.readOnly,
          },
          {
            box: this.secretBox,
            allowLoopback: this.allowLoopback,
            ...(this.factory === undefined ? {} : { factory: this.factory }),
          },
        );
        if (probe.healthStatus !== 'ok') {
          throw new AppError({
            code: 'provider_unavailable',
            explanation: 'The MCP server could not be reached or authenticated.',
            nextAction: 'Check the URL and header secret, then retry.',
            retryable: true,
          });
        }
        try {
          const saved = await withUserScope(this.sql, userId, async (tx) =>
            insertUserMcpServer(tx, {
              userId,
              name: input.name,
              transport: input.transport,
              url: input.url,
              headersEncrypted,
              readOnly: input.readOnly,
              healthStatus: 'ok',
              lastToolCount: Object.keys(probe.tools).length,
              lastValidatedAt: new Date(),
            }),
          );
          return toSummary(saved, Object.values(probe.tools));
        } catch (error) {
          throw new AppError({
            code: 'invalid_input',
            explanation: 'That MCP server URL is already registered.',
            nextAction: 'Use a different URL or remove the existing server.',
            cause: error,
          });
        }
      },
    );
  }

  async remove(
    userId: UserId,
    mcpServerId: UserMcpServer['id'],
    idempotencyKey: string,
  ): Promise<{ ok: true }> {
    const key = `idem:${userId}:mcpServer.remove:${idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as { ok: true },
      (value) => superjson.stringify(value),
      async () => {
        await withUserScope(this.sql, userId, async (tx) => {
          const existing = await getUserMcpServerById(tx, mcpServerId);
          if (existing === null || existing.userId !== userId) {
            throw new AppError({
              code: 'not_found',
              explanation: 'MCP server not found.',
              nextAction: 'Refresh the list and retry.',
            });
          }
          await deleteUserMcpServer(tx, mcpServerId);
        });
        return { ok: true };
      },
    );
  }

  async toggle(
    userId: UserId,
    mcpServerId: UserMcpServer['id'],
    enabled: boolean,
    idempotencyKey: string,
  ): Promise<McpServerSummary> {
    const key = `idem:${userId}:mcpServer.toggle:${enabled}:${idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as McpServerSummary,
      (value) => superjson.stringify(value),
      async () =>
        withUserScope(this.sql, userId, async (tx) => {
          const existing = await getUserMcpServerById(tx, mcpServerId);
          if (existing === null || existing.userId !== userId) {
            throw new AppError({
              code: 'not_found',
              explanation: 'MCP server not found.',
              nextAction: 'Refresh the list and retry.',
            });
          }
          return toSummary(await updateUserMcpServerEnabled(tx, mcpServerId, enabled));
        }),
    );
  }

  async setReadOnly(
    userId: UserId,
    mcpServerId: UserMcpServer['id'],
    readOnly: boolean,
    idempotencyKey: string,
  ): Promise<McpServerSummary> {
    const key = `idem:${userId}:mcpServer.setReadOnly:${readOnly}:${idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as McpServerSummary,
      (value) => superjson.stringify(value),
      async () =>
        withUserScope(this.sql, userId, async (tx) => {
          const existing = await getUserMcpServerById(tx, mcpServerId);
          if (existing === null || existing.userId !== userId) {
            throw new AppError({
              code: 'not_found',
              explanation: 'MCP server not found.',
              nextAction: 'Refresh the list and retry.',
            });
          }
          return toSummary(await updateUserMcpServerReadOnly(tx, mcpServerId, readOnly));
        }),
    );
  }

  async testConnection(
    userId: UserId,
    mcpServerId: UserMcpServer['id'],
  ): Promise<McpServerSummary> {
    return withUserScope(this.sql, userId, async (tx) => {
      const existing = await getUserMcpServerById(tx, mcpServerId);
      if (existing === null || existing.userId !== userId) {
        throw new AppError({
          code: 'not_found',
          explanation: 'MCP server not found.',
          nextAction: 'Refresh the list and retry.',
        });
      }
      const probe = await probeMcpServer(existing, {
        box: this.secretBox,
        allowLoopback: this.allowLoopback,
        ...(this.factory === undefined ? {} : { factory: this.factory }),
      });
      const updated = await updateUserMcpServerHealth(
        tx,
        existing.id,
        probe.healthStatus,
        Object.keys(probe.tools).length,
      );
      return toSummary(updated, Object.values(probe.tools));
    });
  }
}
