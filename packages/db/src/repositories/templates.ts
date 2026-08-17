import {
  ArtifactTypeSchema,
  ArtifactVersionIdSchema,
  RenderJobIdSchema,
  RenderJobSchema,
  RenderJobStatusSchema,
  TemplateIdSchema,
  TemplateSchema,
  type ArtifactType,
  type ArtifactVersionId,
  type RenderJob,
  type RenderJobStatus,
  type Template,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const TemplateRowSchema = z.object({
  id: TemplateIdSchema,
  artifact_type: ArtifactTypeSchema,
  version: z.number().int(),
  definition_json: z.unknown(),
  created_at: z.coerce.date(),
});

type TemplateRow = z.infer<typeof TemplateRowSchema>;

const RenderJobRowSchema = z.object({
  id: RenderJobIdSchema,
  artifact_version_id: ArtifactVersionIdSchema,
  status: RenderJobStatusSchema,
  error_message: z.string().nullable(),
  created_at: z.coerce.date(),
  finished_at: z.coerce.date().nullable(),
});

type RenderJobRow = z.infer<typeof RenderJobRowSchema>;

export function toTemplate(row: TemplateRow): Template {
  return TemplateSchema.parse({
    id: row.id,
    artifactType: row.artifact_type,
    version: row.version,
    definition: row.definition_json,
    createdAt: row.created_at,
  });
}

export function toRenderJob(row: RenderJobRow): RenderJob {
  return RenderJobSchema.parse({
    id: row.id,
    artifactVersionId: row.artifact_version_id,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  });
}

function parseTemplate(row: TemplateRow): Template {
  return toTemplate(TemplateRowSchema.parse(row));
}

function parseRenderJob(row: RenderJobRow): RenderJob {
  return toRenderJob(RenderJobRowSchema.parse(row));
}

export async function getTemplateByTypeAndVersion(
  sql: Sql,
  artifactType: ArtifactType,
  version: number,
): Promise<Template | null> {
  const rows = await sql<TemplateRow[]>`
    select * from templates
    where artifact_type = ${artifactType} and version = ${version}
    limit 1
  `;
  const row = rows[0];
  return row === undefined ? null : parseTemplate(row);
}

export async function getLatestTemplate(
  sql: Sql,
  artifactType: ArtifactType,
): Promise<Template | null> {
  const rows = await sql<TemplateRow[]>`
    select * from templates
    where artifact_type = ${artifactType}
    order by version desc
    limit 1
  `;
  const row = rows[0];
  return row === undefined ? null : parseTemplate(row);
}

export async function insertRenderJob(
  sql: Sql,
  input: { artifactVersionId: ArtifactVersionId },
): Promise<RenderJob> {
  const rows = await sql<RenderJobRow[]>`
    insert into render_jobs (artifact_version_id, status)
    values (${input.artifactVersionId}, 'queued')
    returning *
  `;
  return parseRenderJob(requireRow(rows, 'insertRenderJob'));
}

export async function updateRenderJobStatus(
  sql: Sql,
  id: RenderJob['id'],
  status: RenderJobStatus,
  errorMessage?: string | null,
): Promise<RenderJob> {
  const finished = status === 'succeeded' || status === 'failed';
  if (errorMessage === undefined) {
    const rows = await sql<RenderJobRow[]>`
      update render_jobs
      set
        status = ${status},
        finished_at = ${finished ? new Date() : null}
      where id = ${id}
      returning *
    `;
    return parseRenderJob(requireRow(rows, 'updateRenderJobStatus'));
  }
  const rows = await sql<RenderJobRow[]>`
    update render_jobs
    set
      status = ${status},
      error_message = ${errorMessage},
      finished_at = ${finished ? new Date() : null}
    where id = ${id}
    returning *
  `;
  return parseRenderJob(requireRow(rows, 'updateRenderJobStatus'));
}

export async function getLatestRenderJobByVersionId(
  sql: Sql,
  artifactVersionId: ArtifactVersionId,
): Promise<RenderJob | null> {
  const rows = await sql<RenderJobRow[]>`
    select * from render_jobs
    where artifact_version_id = ${artifactVersionId}
    order by created_at desc
    limit 1
  `;
  const row = rows[0];
  return row === undefined ? null : parseRenderJob(row);
}
