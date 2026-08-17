import { createMCPClient } from '@ai-sdk/mcp';
import { limits } from '@foundry/config/limits';
import type { UserMcpServer } from '@foundry/domain';
import { isAppError } from '@foundry/observability';

import { applyMcpRiskPolicy, type McpToolMeta } from './mcp-risk-policy.js';
import { assertPublicHttpUrl } from './ssrf.js';
import type { SecretBox } from '../secrets/envelope.js';

export type McpToolProbe = {
  tools: Record<string, McpToolMeta>;
  healthStatus: 'ok' | 'unreachable' | 'auth_failed';
};

export type McpClientLike = {
  tools(): Promise<Record<string, { description?: string }>>;
  close(): Promise<void>;
};

export type McpClientFactory = (input: {
  url: string;
  transport: UserMcpServer['transport'];
  headers?: Record<string, string>;
  timeoutMs: number;
}) => Promise<McpClientLike>;

export const defaultMcpClientFactory: McpClientFactory = async (input) => {
  const client = await createMCPClient({
    transport: {
      type: input.transport === 'sse' ? 'sse' : 'http',
      url: input.url,
      redirect: 'error',
      ...(input.headers === undefined ? {} : { headers: input.headers }),
    },
  });
  return {
    async tools() {
      return (await client.tools()) as Record<string, { description?: string }>;
    },
    async close() {
      await client.close();
    },
  };
};

export async function probeMcpServer(
  server: Pick<UserMcpServer, 'name' | 'transport' | 'url' | 'headersEncrypted'> &
    Partial<Pick<UserMcpServer, 'id' | 'userId' | 'enabled' | 'healthStatus' | 'createdAt'>>,
  options: {
    box: SecretBox;
    allowLoopback?: boolean;
    factory?: McpClientFactory;
  },
): Promise<McpToolProbe> {
  await assertPublicHttpUrl(server.url, {
    ...(options.allowLoopback === undefined ? {} : { allowLoopback: options.allowLoopback }),
  });
  const factory = options.factory ?? defaultMcpClientFactory;
  const headers =
    server.headersEncrypted === null || server.headersEncrypted === undefined
      ? undefined
      : { Authorization: options.box.decrypt(server.headersEncrypted) };
  const stubServer = {
    name: server.name,
    transport: server.transport,
    url: server.url,
    headersEncrypted: server.headersEncrypted ?? null,
    id: server.id,
    userId: server.userId,
    enabled: server.enabled ?? true,
    healthStatus: server.healthStatus ?? 'unknown',
    lastToolCount: null,
    lastValidatedAt: null,
    createdAt: server.createdAt ?? new Date(),
  } as UserMcpServer;

  let client: McpClientLike | undefined;
  try {
    client = await factory({
      url: server.url,
      transport: server.transport,
      ...(headers === undefined ? {} : { headers }),
      timeoutMs: limits.mcp.listToolsProbeTimeoutMs,
    });
    const raw = await Promise.race([
      client.tools(),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('listTools timed out')),
          limits.mcp.listToolsProbeTimeoutMs,
        );
      }),
    ]);
    return {
      tools: applyMcpRiskPolicy(stubServer, raw),
      healthStatus: 'ok',
    };
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return {
      tools: {},
      healthStatus:
        message.includes('401') || message.includes('auth') ? 'auth_failed' : 'unreachable',
    };
  } finally {
    await client?.close();
  }
}
