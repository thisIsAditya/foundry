import {
  AgentRunIdSchema,
  UsageRecordIdSchema,
  UsageRecordSchema,
  UsageResourceTypeSchema,
  WorkspaceIdSchema,
  type AgentRunId,
  type UsageRecord,
  type UsageResourceType,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const UsageRecordRowSchema = z.object({
  id: UsageRecordIdSchema,
  agent_run_id: AgentRunIdSchema.nullable(),
  workspace_id: WorkspaceIdSchema,
  provider: z.string(),
  resource_type: UsageResourceTypeSchema,
  quantity: z.string(),
  cost_usd: z.string(),
  created_at: z.coerce.date(),
});

type UsageRecordRow = z.infer<typeof UsageRecordRowSchema>;

export type InsertUsageRecord = {
  workspaceId: WorkspaceId;
  provider: string;
  resourceType: UsageResourceType;
  quantity: string;
  costUsd: string;
  agentRunId?: AgentRunId | null;
};

export function toUsageRecord(row: UsageRecordRow): UsageRecord {
  return UsageRecordSchema.parse({
    id: row.id,
    agentRunId: row.agent_run_id,
    workspaceId: row.workspace_id,
    provider: row.provider,
    resourceType: row.resource_type,
    quantity: row.quantity,
    costUsd: row.cost_usd,
    createdAt: row.created_at,
  });
}

function parseUsageRecord(row: UsageRecordRow): UsageRecord {
  return toUsageRecord(UsageRecordRowSchema.parse(row));
}

export async function insertUsageRecord(sql: Sql, input: InsertUsageRecord): Promise<UsageRecord> {
  const rows = await sql<UsageRecordRow[]>`
    insert into usage_records (
      agent_run_id, workspace_id, provider, resource_type, quantity, cost_usd
    )
    values (
      ${input.agentRunId ?? null},
      ${input.workspaceId},
      ${input.provider},
      ${input.resourceType},
      ${input.quantity},
      ${input.costUsd}
    )
    returning *
  `;
  return parseUsageRecord(requireRow(rows, 'insertUsageRecord'));
}
