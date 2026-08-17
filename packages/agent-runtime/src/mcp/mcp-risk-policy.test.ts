import { describe, expect, it } from 'vitest';

import { applyMcpRiskPolicy } from './mcp-risk-policy.js';
import { UserIdSchema, UserMcpServerIdSchema, type UserMcpServer } from '@foundry/domain';

describe('MCP risk policy', () => {
  it('forces side_effect and prefixes names', () => {
    const server: UserMcpServer = {
      id: UserMcpServerIdSchema.parse('11111111-1111-4111-8111-111111111111'),
      userId: UserIdSchema.parse('22222222-2222-4222-8222-222222222222'),
      name: 'Internal KB',
      transport: 'http',
      url: 'https://kb.example.com/mcp',
      headersEncrypted: null,
      enabled: true,
      healthStatus: 'ok',
      lastToolCount: 1,
      lastValidatedAt: new Date('2026-04-01T00:00:00.000Z'),
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
    };
    const result = applyMcpRiskPolicy(server, {
      search: { description: 'Search docs', riskClass: 'read' },
    });
    expect(result.mcp_internal_kb_search).toEqual({
      name: 'mcp_internal_kb_search',
      description: 'Search docs',
      riskClass: 'side_effect',
    });
  });
});
