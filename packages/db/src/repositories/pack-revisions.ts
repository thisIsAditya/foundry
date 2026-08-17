import {
  ActorTypeSchema,
  PackRevisionIdSchema,
  PackRevisionSchema,
  PackRevisionStatusSchema,
  ProjectIdSchema,
  SprintIdSchema,
  type ActorType,
  type PackRevision,
  type PackRevisionId,
  type PackRevisionStatus,
  type ProjectId,
  type SprintId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const PackRevisionRowSchema = z.object({
  id: PackRevisionIdSchema,
  project_id: ProjectIdSchema,
  revision_number: z.number().int(),
  parent_revision_id: PackRevisionIdSchema.nullable(),
  actor_type: ActorTypeSchema,
  actor_id: z.string().nullable(),
  source_sprint_id: SprintIdSchema.nullable(),
  status: PackRevisionStatusSchema,
  proposed_changes: z.unknown(),
  accepted_changes: z.unknown().nullable(),
  validation_results: z.unknown().nullable(),
  gate_results: z.unknown().nullable(),
  dependency_invalidations: z.unknown().nullable(),
  created_at: z.coerce.date(),
  accepted_at: z.coerce.date().nullable(),
});

type PackRevisionRow = z.infer<typeof PackRevisionRowSchema>;

export type InsertPackRevision = {
  projectId: ProjectId;
  revisionNumber: number;
  actorType: ActorType;
  actorId?: string | null;
  status?: PackRevisionStatus;
  proposedChanges: unknown;
  parentRevisionId?: PackRevisionId | null;
  sourceSprintId?: SprintId | null;
};

export function toPackRevision(row: PackRevisionRow): PackRevision {
  return PackRevisionSchema.parse({
    id: row.id,
    projectId: row.project_id,
    revisionNumber: row.revision_number,
    parentRevisionId: row.parent_revision_id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    sourceSprintId: row.source_sprint_id,
    status: row.status,
    proposedChanges: row.proposed_changes,
    acceptedChanges: row.accepted_changes,
    validationResults: row.validation_results,
    gateResults: row.gate_results,
    dependencyInvalidations: row.dependency_invalidations,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
  });
}

function parsePackRevision(row: PackRevisionRow): PackRevision {
  return toPackRevision(PackRevisionRowSchema.parse(row));
}

export async function insertPackRevision(
  sql: Sql,
  input: InsertPackRevision,
): Promise<PackRevision> {
  const rows = await sql<PackRevisionRow[]>`
    insert into pack_revisions (
      project_id,
      revision_number,
      parent_revision_id,
      actor_type,
      actor_id,
      source_sprint_id,
      status,
      proposed_changes
    )
    values (
      ${input.projectId},
      ${input.revisionNumber},
      ${input.parentRevisionId ?? null},
      ${input.actorType},
      ${input.actorId ?? null},
      ${input.sourceSprintId ?? null},
      ${input.status ?? 'draft'},
      ${jsonParam(sql, input.proposedChanges)}
    )
    returning *
  `;
  return parsePackRevision(requireRow(rows, 'insertPackRevision'));
}

export async function getPackRevisionById(
  sql: Sql,
  id: PackRevisionId,
): Promise<PackRevision | null> {
  const rows = await sql<PackRevisionRow[]>`
    select * from pack_revisions where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parsePackRevision(row);
}

export async function listPackRevisionsByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<PackRevision[]> {
  const rows = await sql<PackRevisionRow[]>`
    select * from pack_revisions where project_id = ${projectId} order by revision_number asc
  `;
  return rows.map(parsePackRevision);
}

export async function updatePackRevisionStatus(
  sql: Sql,
  id: PackRevisionId,
  status: PackRevisionStatus,
): Promise<PackRevision> {
  const acceptedAt = status === 'accepted' ? new Date() : null;
  const rows = await sql<PackRevisionRow[]>`
    update pack_revisions
    set status = ${status},
        accepted_at = ${acceptedAt}
    where id = ${id}
    returning *
  `;
  return parsePackRevision(requireRow(rows, 'updatePackRevisionStatus'));
}

export async function updatePackRevisionProposedChanges(
  sql: Sql,
  id: PackRevisionId,
  proposedChanges: unknown,
): Promise<PackRevision> {
  const rows = await sql<PackRevisionRow[]>`
    update pack_revisions
    set proposed_changes = ${jsonParam(sql, proposedChanges)}
    where id = ${id}
    returning *
  `;
  return parsePackRevision(requireRow(rows, 'updatePackRevisionProposedChanges'));
}
