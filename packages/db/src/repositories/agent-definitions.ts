import {
  AgentDefinitionIdSchema,
  AgentDefinitionSchema,
  type AgentDefinition,
  type AgentDefinitionId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';

const AgentDefinitionRowSchema = z.object({
  id: AgentDefinitionIdSchema,
  name: z.string(),
  version: z.number().int(),
  instructions_text: z.string(),
  capabilities_json: z.unknown(),
  policy_defaults_json: z.unknown(),
  created_at: z.coerce.date(),
});

type AgentDefinitionRow = z.infer<typeof AgentDefinitionRowSchema>;

export function toAgentDefinition(row: AgentDefinitionRow): AgentDefinition {
  return AgentDefinitionSchema.parse({
    id: row.id,
    name: row.name,
    version: row.version,
    instructionsText: row.instructions_text,
    capabilities: row.capabilities_json,
    policyDefaults: row.policy_defaults_json,
    createdAt: row.created_at,
  });
}

function parseAgentDefinition(row: AgentDefinitionRow): AgentDefinition {
  return toAgentDefinition(AgentDefinitionRowSchema.parse(row));
}

export async function getCurrentAgentDefinition(
  sql: Sql,
  name: string,
): Promise<AgentDefinition | null> {
  const rows = await sql<AgentDefinitionRow[]>`
    select * from agent_definitions
    where name = ${name}
    order by version desc
    limit 1
  `;
  const row = rows[0];
  return row === undefined ? null : parseAgentDefinition(row);
}

export async function getAgentDefinitionById(
  sql: Sql,
  id: AgentDefinitionId,
): Promise<AgentDefinition | null> {
  const rows = await sql<AgentDefinitionRow[]>`
    select * from agent_definitions where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parseAgentDefinition(row);
}
