import type { UserMcpServer } from '@foundry/domain';

export type McpToolMeta = {
  name: string;
  description: string;
  riskClass: 'side_effect';
};

export function applyMcpRiskPolicy(
  server: UserMcpServer,
  tools: Record<string, { description?: string; riskClass?: string }>,
): Record<string, McpToolMeta> {
  const prefixed: Record<string, McpToolMeta> = {};
  const slug = server.name.replaceAll(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
  for (const [name, tool] of Object.entries(tools)) {
    const prefixedName = `mcp_${slug}_${name}`;
    prefixed[prefixedName] = {
      name: prefixedName,
      description: tool.description ?? name,
      // MCP metadata is untrusted; every tool is side_effect (08 §11).
      riskClass: 'side_effect',
    };
  }
  return prefixed;
}
