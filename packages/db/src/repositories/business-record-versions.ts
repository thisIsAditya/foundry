import {
  BusinessRecordVersionIdSchema,
  BusinessRecordVersionSchema,
  ProjectIdSchema,
  ProposalIdSchema,
  WorkspaceIdSchema,
  type BusinessRecordVersion,
  type ProjectId,
  type ProposalId,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import { parseUuidArray } from '../arrays.js';
import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const RowSchema = z.object({
  id: BusinessRecordVersionIdSchema,
  project_id: ProjectIdSchema,
  workspace_id: WorkspaceIdSchema,
  version_number: z.number().int(),
  accepted_by: z.string().nullable(),
  accepted_at: z.coerce.date(),
  source_proposal_ids: z.unknown(),
  export_metadata: z.unknown(),
  compatibility_source_ref: z.string().nullable(),
});

type Row = z.infer<typeof RowSchema>;

export type InsertBusinessRecordVersion = {
  projectId: ProjectId;
  workspaceId: WorkspaceId;
  versionNumber: number;
  acceptedBy?: string | null;
  sourceProposalIds?: ProposalId[];
  exportMetadata?: unknown;
  compatibilitySourceRef?: string | null;
};

export function toBusinessRecordVersion(row: Row): BusinessRecordVersion {
  return BusinessRecordVersionSchema.parse({
    id: row.id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    versionNumber: row.version_number,
    acceptedBy: row.accepted_by,
    acceptedAt: row.accepted_at,
    sourceProposalIds: z.array(ProposalIdSchema).parse(parseUuidArray(row.source_proposal_ids)),
    exportMetadata: row.export_metadata,
    compatibilitySourceRef: row.compatibility_source_ref,
  });
}

function parse(row: Row): BusinessRecordVersion {
  return toBusinessRecordVersion(RowSchema.parse(row));
}

export async function insertBusinessRecordVersion(
  sql: Sql,
  input: InsertBusinessRecordVersion,
): Promise<BusinessRecordVersion> {
  const rows = await sql<Row[]>`
    insert into business_record_versions (
      project_id,
      workspace_id,
      version_number,
      accepted_by,
      source_proposal_ids,
      export_metadata,
      compatibility_source_ref
    )
    values (
      ${input.projectId},
      ${input.workspaceId},
      ${input.versionNumber},
      ${input.acceptedBy ?? null},
      ${input.sourceProposalIds ?? []},
      ${jsonParam(sql, input.exportMetadata ?? {})},
      ${input.compatibilitySourceRef ?? null}
    )
    returning *
  `;
  return parse(requireRow(rows, 'insertBusinessRecordVersion'));
}

export async function getLatestBusinessRecordVersion(
  sql: Sql,
  projectId: ProjectId,
): Promise<BusinessRecordVersion | null> {
  const rows = await sql<Row[]>`
    select * from business_record_versions
    where project_id = ${projectId}
    order by version_number desc
    limit 1
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}

export async function nextBusinessRecordVersionNumber(
  sql: Sql,
  projectId: ProjectId,
): Promise<number> {
  const rows = await sql<{ next: number | null }[]>`
    select max(version_number) + 1 as next
    from business_record_versions
    where project_id = ${projectId}
  `;
  return rows[0]?.next ?? 1;
}
