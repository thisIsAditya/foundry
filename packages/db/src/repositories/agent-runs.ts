import {
  AgentDefinitionIdSchema,
  AgentRunIdSchema,
  AgentRunSchema,
  AgentRunStatusSchema,
  SprintIdSchema,
  type AgentDefinitionId,
  type AgentRun,
  type AgentRunId,
  type AgentRunStatus,
  type SprintId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const AgentRunRowSchema = z.object({
  id: AgentRunIdSchema,
  sprint_id: SprintIdSchema.nullable(),
  agent_definition_id: AgentDefinitionIdSchema,
  model_profile: z.string(),
  provider: z.string(),
  model_id: z.string(),
  input_tokens: z.number().int().nullable(),
  output_tokens: z.number().int().nullable(),
  cost_usd: z.string().nullable(),
  started_at: z.coerce.date(),
  finished_at: z.coerce.date().nullable(),
  status: AgentRunStatusSchema,
});

type AgentRunRow = z.infer<typeof AgentRunRowSchema>;

export type InsertAgentRun = {
  sprintId?: SprintId | null;
  agentDefinitionId: AgentDefinitionId;
  modelProfile: string;
  provider: string;
  modelId: string;
  status?: AgentRunStatus;
};

export function toAgentRun(row: AgentRunRow): AgentRun {
  return AgentRunSchema.parse({
    id: row.id,
    sprintId: row.sprint_id,
    agentDefinitionId: row.agent_definition_id,
    modelProfile: row.model_profile,
    provider: row.provider,
    modelId: row.model_id,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    costUsd: row.cost_usd,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status,
  });
}

function parseAgentRun(row: AgentRunRow): AgentRun {
  return toAgentRun(AgentRunRowSchema.parse(row));
}

export async function insertAgentRun(sql: Sql, input: InsertAgentRun): Promise<AgentRun> {
  const rows = await sql<AgentRunRow[]>`
    insert into agent_runs (
      sprint_id,
      agent_definition_id,
      model_profile,
      provider,
      model_id,
      status
    )
    values (
      ${input.sprintId ?? null},
      ${input.agentDefinitionId},
      ${input.modelProfile},
      ${input.provider},
      ${input.modelId},
      ${input.status ?? 'running'}
    )
    returning *
  `;
  return parseAgentRun(requireRow(rows, 'insertAgentRun'));
}

export async function completeAgentRun(
  sql: Sql,
  id: AgentRunId,
  input: {
    status: AgentRunStatus;
    inputTokens?: number | null;
    outputTokens?: number | null;
    costUsd?: string | null;
  },
): Promise<AgentRun> {
  const rows = await sql<AgentRunRow[]>`
    update agent_runs
    set status = ${input.status},
        input_tokens = ${input.inputTokens ?? null},
        output_tokens = ${input.outputTokens ?? null},
        cost_usd = ${input.costUsd ?? null},
        finished_at = now()
    where id = ${id}
    returning *
  `;
  return parseAgentRun(requireRow(rows, 'completeAgentRun'));
}
