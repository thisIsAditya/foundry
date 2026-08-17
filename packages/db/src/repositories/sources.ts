import {
  DataClassificationSchema,
  ProjectIdSchema,
  SourceCategorySchema,
  SourceIdSchema,
  SourceKindSchema,
  SourceSchema,
  SourceStatusSchema,
  UserIdSchema,
  type DataClassification,
  type ProjectId,
  type Source,
  type SourceCategory,
  type SourceId,
  type SourceKind,
  type SourceStatus,
  type UserId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const SourceRowSchema = z.object({
  id: SourceIdSchema,
  project_id: ProjectIdSchema,
  kind: SourceKindSchema,
  status: SourceStatusSchema,
  original_filename: z.string().nullable(),
  mime_type: z.string().nullable(),
  size_bytes: z.coerce.number().int().nullable(),
  s3_key: z.string().nullable(),
  source_url: z.string().nullable(),
  source_category: SourceCategorySchema.nullable(),
  geographic_scope: z.string().nullable(),
  reliability_notes: z.string().nullable(),
  data_classification: DataClassificationSchema,
  failure_reason: z.string().nullable(),
  created_by_user_id: UserIdSchema.nullable(),
  created_at: z.coerce.date(),
});

type SourceRow = z.infer<typeof SourceRowSchema>;

export type InsertSource = {
  id?: SourceId;
  projectId: ProjectId;
  kind: SourceKind;
  status?: SourceStatus;
  originalFilename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  s3Key?: string | null;
  sourceUrl?: string | null;
  sourceCategory?: SourceCategory | null;
  geographicScope?: string | null;
  reliabilityNotes?: string | null;
  dataClassification?: DataClassification;
  createdByUserId?: UserId | null;
};

export function toSource(row: SourceRow): Source {
  return SourceSchema.parse({
    id: row.id,
    projectId: row.project_id,
    kind: row.kind,
    status: row.status,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    s3Key: row.s3_key,
    sourceUrl: row.source_url,
    sourceCategory: row.source_category,
    geographicScope: row.geographic_scope,
    reliabilityNotes: row.reliability_notes,
    dataClassification: row.data_classification,
    failureReason: row.failure_reason,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
  });
}

function parseSource(row: SourceRow): Source {
  return toSource(SourceRowSchema.parse(row));
}

export async function insertSource(sql: Sql, input: InsertSource): Promise<Source> {
  const id = input.id;
  const rows =
    id === undefined
      ? await sql<SourceRow[]>`
          insert into sources (
            project_id,
            kind,
            status,
            original_filename,
            mime_type,
            size_bytes,
            s3_key,
            source_url,
            source_category,
            geographic_scope,
            reliability_notes,
            data_classification,
            created_by_user_id
          )
          values (
            ${input.projectId},
            ${input.kind},
            ${input.status ?? 'pending'},
            ${input.originalFilename ?? null},
            ${input.mimeType ?? null},
            ${input.sizeBytes ?? null},
            ${input.s3Key ?? null},
            ${input.sourceUrl ?? null},
            ${input.sourceCategory ?? null},
            ${input.geographicScope ?? null},
            ${input.reliabilityNotes ?? null},
            ${input.dataClassification ?? 'internal'},
            ${input.createdByUserId ?? null}
          )
          returning *
        `
      : await sql<SourceRow[]>`
          insert into sources (
            id,
            project_id,
            kind,
            status,
            original_filename,
            mime_type,
            size_bytes,
            s3_key,
            source_url,
            source_category,
            geographic_scope,
            reliability_notes,
            data_classification,
            created_by_user_id
          )
          values (
            ${id},
            ${input.projectId},
            ${input.kind},
            ${input.status ?? 'pending'},
            ${input.originalFilename ?? null},
            ${input.mimeType ?? null},
            ${input.sizeBytes ?? null},
            ${input.s3Key ?? null},
            ${input.sourceUrl ?? null},
            ${input.sourceCategory ?? null},
            ${input.geographicScope ?? null},
            ${input.reliabilityNotes ?? null},
            ${input.dataClassification ?? 'internal'},
            ${input.createdByUserId ?? null}
          )
          returning *
        `;
  return parseSource(requireRow(rows, 'insertSource'));
}

export async function getSourceById(sql: Sql, id: SourceId): Promise<Source | null> {
  const rows = await sql<SourceRow[]>`
    select * from sources where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parseSource(row);
}

export async function listSourcesByProjectId(sql: Sql, projectId: ProjectId): Promise<Source[]> {
  const rows = await sql<SourceRow[]>`
    select * from sources
    where project_id = ${projectId}
      and status <> 'tombstoned'
    order by created_at desc
  `;
  return rows.map(parseSource);
}

export async function updateSourceStatus(
  sql: Sql,
  id: SourceId,
  status: SourceStatus,
  failureReason: string | null = null,
): Promise<Source> {
  const rows = await sql<SourceRow[]>`
    update sources
    set status = ${status},
        failure_reason = ${failureReason}
    where id = ${id}
    returning *
  `;
  return parseSource(requireRow(rows, 'updateSourceStatus'));
}

export async function updateSourceMimeType(
  sql: Sql,
  id: SourceId,
  mimeType: string,
): Promise<Source> {
  const rows = await sql<SourceRow[]>`
    update sources
    set mime_type = ${mimeType}
    where id = ${id}
    returning *
  `;
  return parseSource(requireRow(rows, 'updateSourceMimeType'));
}
