import { describe, expect, it } from 'vitest';

import { applyMcpRiskPolicy } from './mcp-risk-policy.js';
import { UserIdSchema, UserMcpServerIdSchema, type UserMcpServer } from '@foundry/domain';

function baseServer(overrides: Partial<UserMcpServer> = {}): UserMcpServer {
  return {
    id: UserMcpServerIdSchema.parse('11111111-1111-4111-8111-111111111111'),
    userId: UserIdSchema.parse('22222222-2222-4222-8222-222222222222'),
    name: 'Internal KB',
    transport: 'http',
    url: 'https://kb.example.com/mcp',
    headersEncrypted: null,
    enabled: true,
    readOnly: false,
    healthStatus: 'ok',
    lastToolCount: 1,
    lastValidatedAt: new Date('2026-04-01T00:00:00.000Z'),
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('MCP risk policy', () => {
  it('forces side_effect and prefixes names for a server that has not opted into readOnly', () => {
    const result = applyMcpRiskPolicy(baseServer(), {
      search: { description: 'Search docs', riskClass: 'read' },
    });
    expect(result.mcp_internal_kb_search).toEqual({
      name: 'mcp_internal_kb_search',
      description: 'Search docs',
      riskClass: 'side_effect',
    });
  });

  it('tags tools read when the founder has opted the server in as readOnly', () => {
    const result = applyMcpRiskPolicy(baseServer({ readOnly: true }), {
      search: { description: 'Search docs', riskClass: 'read' },
    });
    expect(result.mcp_internal_kb_search).toEqual({
      name: 'mcp_internal_kb_search',
      description: 'Search docs',
      riskClass: 'read',
    });
  });
});
