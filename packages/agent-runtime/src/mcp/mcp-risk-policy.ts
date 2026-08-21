import type { RiskClass, UserMcpServer } from '@foundry/domain';

export type McpToolMeta = {
  name: string;
  description: string;
  riskClass: RiskClass;
};

/**
 * MCP tool metadata is untrusted, so every tool is force-tagged `side_effect` by default (08
 * §11) — except when the founder has explicitly opted a server in as `readOnly` ("treat this
 * server as read-only search, safe for live chat"). That opt-in retags its tools `read`, which
 * is what actually lets them run inline in the interactive co-founder turn (capped at
 * `compute`/`draft`, never able to admit `side_effect`). Still no per-tool trust — the whole
 * server is either read-only or side-effecting, by founder declaration.
 */
export function applyMcpRiskPolicy(
  server: UserMcpServer,
  tools: Record<string, { description?: string; riskClass?: string }>,
): Record<string, McpToolMeta> {
  const prefixed: Record<string, McpToolMeta> = {};
  const slug = server.name.replaceAll(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
  const riskClass: RiskClass = server.readOnly ? 'read' : 'side_effect';
  for (const [name, tool] of Object.entries(tools)) {
    const prefixedName = `mcp_${slug}_${name}`;
    prefixed[prefixedName] = {
      name: prefixedName,
      description: tool.description ?? name,
      riskClass,
    };
  }
  return prefixed;
}
