import {
  CofounderInteractionTypeSchema,
  ProjectIdSchema,
  ProposalIdSchema,
  ProposalSchema,
  ProposalStatusSchema,
  WorkspaceIdSchema,
  type CofounderInteractionType,
  type ProjectId,
  type Proposal,
  type ProposalId,
  type ProposalStatus,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const RowSchema = z.object({
  id: ProposalIdSchema,
  project_id: ProjectIdSchema,
  workspace_id: WorkspaceIdSchema,
  author_type: z.enum(['founder', 'cofounder', 'system']),
  author_id: z.string().nullable(),
  status: ProposalStatusSchema,
  rationale: z.string(),
  uncertainty: z.string().nullable(),
  interaction_type: CofounderInteractionTypeSchema.nullable(),
  context_references: z.unknown(),
  expires_at: z.coerce.date().nullable(),
  correlation_id: z.string().uuid().nullable(),
  revision: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

type Row = z.infer<typeof RowSchema>;

export type InsertProposalV4 = {
  projectId: ProjectId;
  workspaceId: WorkspaceId;
  authorType: 'founder' | 'cofounder' | 'system';
  authorId?: string | null;
  status?: ProposalStatus;
  rationale: string;
  uncertainty?: string | null;
  interactionType?: CofounderInteractionType | null;
  contextReferences?: unknown;
  correlationId?: string | null;
};

export function toProposalV4(row: Row): Proposal {
  return ProposalSchema.parse({
    id: row.id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    authorType: row.author_type,
    authorId: row.author_id,
    status: row.status,
    rationale: row.rationale,
    uncertainty: row.uncertainty,
    interactionType: row.interaction_type,
    contextReferences: row.context_references,
    expiresAt: row.expires_at,
    correlationId: row.correlation_id,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function parse(row: Row): Proposal {
  return toProposalV4(RowSchema.parse(row));
}

export async function insertProposalV4(sql: Sql, input: InsertProposalV4): Promise<Proposal> {
  const rows = await sql<Row[]>`
    insert into proposals_v4 (
      project_id,
      workspace_id,
      author_type,
      author_id,
      status,
      rationale,
      uncertainty,
      interaction_type,
      context_references,
      correlation_id
    )
    values (
      ${input.projectId},
      ${input.workspaceId},
      ${input.authorType},
      ${input.authorId ?? null},
      ${input.status ?? 'awaiting_founder'},
      ${input.rationale},
      ${input.uncertainty ?? null},
      ${input.interactionType ?? null},
      ${jsonParam(sql, input.contextReferences ?? [])},
      ${input.correlationId ?? null}
    )
    returning *
  `;
  return parse(requireRow(rows, 'insertProposalV4'));
}

export async function getProposalV4ById(sql: Sql, id: ProposalId): Promise<Proposal | null> {
  const rows = await sql<Row[]>`
    select * from proposals_v4 where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}

export async function listProposalsV4ByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<Proposal[]> {
  const rows = await sql<Row[]>`
    select * from proposals_v4 where project_id = ${projectId} order by created_at desc
  `;
  return rows.map(parse);
}

export async function updateProposalV4Status(
  sql: Sql,
  id: ProposalId,
  input: { expectedRevision: number; status: ProposalStatus },
): Promise<Proposal | null> {
  const rows = await sql<Row[]>`
    update proposals_v4
    set status = ${input.status}, revision = revision + 1, updated_at = now()
    where id = ${id} and revision = ${input.expectedRevision}
    returning *
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}
