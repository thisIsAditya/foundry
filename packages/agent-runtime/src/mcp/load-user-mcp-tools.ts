import { createMCPClient } from '@ai-sdk/mcp';
import { limits } from '@foundry/config/limits';
import type { RiskClass, UserMcpServer } from '@foundry/domain';
import { getLogger } from '@foundry/observability';
import type { Tool } from 'ai';

import { assertPublicHttpUrl } from './ssrf.js';
import type { SecretBox } from '../secrets/envelope.js';

export type McpToolClientLike = {
  tools(): Promise<Record<string, Tool>>;
  close(): Promise<void>;
};

export type McpToolClientFactory = (input: {
  url: string;
  transport: UserMcpServer['transport'];
  headers?: Record<string, string>;
  timeoutMs: number;
}) => Promise<McpToolClientLike>;

export const defaultMcpToolClientFactory: McpToolClientFactory = async (input) => {
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
      return (await client.tools()) as Record<string, Tool>;
    },
    async close() {
      await client.close();
    },
  };
};

export type LoadedMcpTools = {
  tools: Record<string, Tool>;
  riskClasses: Record<string, RiskClass>;
};

function slugify(name: string): string {
  return name.replaceAll(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
}

/**
 * Loads AI SDK tools from a user's enabled MCP servers so a run can offer them to a model (08
 * §11). Every MCP tool is tagged `side_effect` risk since its schema and behavior are untrusted
 * — unless the founder opted the whole server in as `readOnly` ("safe for live chat"), in which
 * case its tools are tagged `read` instead (matching `applyMcpRiskPolicy`'s probe-time
 * classification). `PolicyService.filterTools` still decides whether a given run's risk ceiling
 * admits it. Servers that are unreachable, blocked by the SSRF guard, or misconfigured are
 * skipped rather than failing the run.
 */
export async function loadUserMcpTools(
  servers: readonly UserMcpServer[],
  options: { box: SecretBox; factory?: McpToolClientFactory; allowLoopback?: boolean },
): Promise<LoadedMcpTools> {
  const logger = getLogger();
  const tools: Record<string, Tool> = {};
  const riskClasses: Record<string, RiskClass> = {};
  const factory = options.factory ?? defaultMcpToolClientFactory;

  for (const server of servers) {
    if (!server.enabled) {
      continue;
    }
    let client: McpToolClientLike | undefined;
    try {
      await assertPublicHttpUrl(server.url, {
        ...(options.allowLoopback === undefined ? {} : { allowLoopback: options.allowLoopback }),
      });
      const headers =
        server.headersEncrypted === null
          ? undefined
          : { Authorization: options.box.decrypt(server.headersEncrypted) };
      client = await factory({
        url: server.url,
        transport: server.transport,
        ...(headers === undefined ? {} : { headers }),
        timeoutMs: limits.mcp.listToolsProbeTimeoutMs,
      });
      const raw = await client.tools();
      const slug = slugify(server.name);
      const riskClass: RiskClass = server.readOnly ? 'read' : 'side_effect';
      for (const [name, tool] of Object.entries(raw)) {
        const prefixedName = `mcp_${slug}_${name}`;
        tools[prefixedName] = tool;
        riskClasses[prefixedName] = riskClass;
      }
      logger.info(
        {
          event: 'mcp_tools_loaded',
          serverName: server.name,
          transport: server.transport,
          readOnly: server.readOnly,
          toolCount: Object.keys(raw).length,
        },
        'MCP tools loaded',
      );
    } catch (error) {
      // Unreachable, blocked, or misconfigured servers are skipped; the run continues without them.
      logger.warn(
        {
          event: 'mcp_tools_load_failed',
          serverName: server.name,
          transport: server.transport,
          readOnly: server.readOnly,
          errorName: error instanceof Error ? error.name : 'unknown_error',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
        'MCP tools could not be loaded',
      );
    } finally {
      await client?.close();
    }
  }

  return { tools, riskClasses };
}
