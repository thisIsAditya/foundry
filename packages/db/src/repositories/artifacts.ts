import {
  ArtifactIdSchema,
  ArtifactSchema,
  ArtifactStatusSchema,
  ArtifactTypeSchema,
  ArtifactVersionIdSchema,
  ArtifactVersionSchema,
  PackRevisionIdSchema,
  ProjectIdSchema,
  TemplateIdSchema,
  type Artifact,
  type ArtifactId,
  type ArtifactStatus,
  type ArtifactType,
  type ArtifactVersion,
  type PackRevisionId,
  type ProjectId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const ArtifactRowSchema = z.object({
  id: ArtifactIdSchema,
  project_id: ProjectIdSchema,
  artifact_type: ArtifactTypeSchema,
  current_version_id: ArtifactVersionIdSchema.nullable(),
  created_at: z.coerce.date(),
});

const ArtifactVersionRowSchema = z.object({
  id: ArtifactVersionIdSchema,
  artifact_id: ArtifactIdSchema,
  version_number: z.number().int(),
  pack_revision_id: PackRevisionIdSchema,
  template_id: TemplateIdSchema.nullable(),
  s3_key: z.string(),
  status: ArtifactStatusSchema,
  citations_json: z.unknown().nullable(),
  created_at: z.coerce.date(),
});

type ArtifactRow = z.infer<typeof ArtifactRowSchema>;
type ArtifactVersionRow = z.infer<typeof ArtifactVersionRowSchema>;

export function toArtifact(row: ArtifactRow): Artifact {
  return ArtifactSchema.parse({
    id: row.id,
    projectId: row.project_id,
    artifactType: row.artifact_type,
    currentVersionId: row.current_version_id,
    createdAt: row.created_at,
  });
}

export function toArtifactVersion(row: ArtifactVersionRow): ArtifactVersion {
  return ArtifactVersionSchema.parse({
    id: row.id,
    artifactId: row.artifact_id,
    versionNumber: row.version_number,
    packRevisionId: row.pack_revision_id,
    templateId: row.template_id,
    s3Key: row.s3_key,
    status: row.status,
    citations: row.citations_json,
    createdAt: row.created_at,
  });
}

function parseArtifact(row: ArtifactRow): Artifact {
  return toArtifact(ArtifactRowSchema.parse(row));
}

function parseVersion(row: ArtifactVersionRow): ArtifactVersion {
  return toArtifactVersion(ArtifactVersionRowSchema.parse(row));
}

export async function getArtifactById(sql: Sql, id: ArtifactId): Promise<Artifact | null> {
  const rows = await sql<ArtifactRow[]>`
    select * from artifacts where id = ${id} limit 1
  `;
  const row = rows[0];
  return row === undefined ? null : parseArtifact(row);
}

export async function getArtifactByProjectAndType(
  sql: Sql,
  projectId: ProjectId,
  artifactType: ArtifactType,
): Promise<Artifact | null> {
  const rows = await sql<ArtifactRow[]>`
    select * from artifacts
    where project_id = ${projectId} and artifact_type = ${artifactType}
    limit 1
  `;
  const row = rows[0];
  return row === undefined ? null : parseArtifact(row);
}

export async function insertArtifact(
  sql: Sql,
  input: { projectId: ProjectId; artifactType: ArtifactType },
): Promise<Artifact> {
  const rows = await sql<ArtifactRow[]>`
    insert into artifacts (project_id, artifact_type)
    values (${input.projectId}, ${input.artifactType})
    returning *
  `;
  return parseArtifact(requireRow(rows, 'insertArtifact'));
}

export async function listArtifactsByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<Artifact[]> {
  const rows = await sql<ArtifactRow[]>`
    select * from artifacts where project_id = ${projectId} order by created_at desc
  `;
  return rows.map(parseArtifact);
}

export async function insertArtifactVersion(
  sql: Sql,
  input: {
    artifactId: ArtifactId;
    versionNumber: number;
    packRevisionId: PackRevisionId;
    s3Key: string;
    status: ArtifactStatus;
    citations?: unknown;
    templateId?: ArtifactVersion['templateId'];
  },
): Promise<ArtifactVersion> {
  const templateId = input.templateId ?? null;
  const rows = await sql<ArtifactVersionRow[]>`
    insert into artifact_versions (
      artifact_id,
      version_number,
      pack_revision_id,
      template_id,
      s3_key,
      status,
      citations_json
    )
    values (
      ${input.artifactId},
      ${input.versionNumber},
      ${input.packRevisionId},
      ${templateId},
      ${input.s3Key},
      ${input.status},
      ${input.citations === undefined ? null : jsonParam(sql, input.citations)}
    )
    returning *
  `;
  return parseVersion(requireRow(rows, 'insertArtifactVersion'));
}

export async function getArtifactVersionById(
  sql: Sql,
  id: ArtifactVersion['id'],
): Promise<ArtifactVersion | null> {
  const rows = await sql<ArtifactVersionRow[]>`
    select * from artifact_versions where id = ${id} limit 1
  `;
  const row = rows[0];
  return row === undefined ? null : parseVersion(row);
}

export async function getArtifactVersionByNumber(
  sql: Sql,
  artifactId: ArtifactId,
  versionNumber: number,
): Promise<ArtifactVersion | null> {
  const rows = await sql<ArtifactVersionRow[]>`
    select * from artifact_versions
    where artifact_id = ${artifactId} and version_number = ${versionNumber}
    limit 1
  `;
  const row = rows[0];
  return row === undefined ? null : parseVersion(row);
}

export async function updateArtifactVersionStatus(
  sql: Sql,
  id: ArtifactVersion['id'],
  status: ArtifactStatus,
  citations?: unknown,
): Promise<ArtifactVersion> {
  if (citations === undefined) {
    const rows = await sql<ArtifactVersionRow[]>`
      update artifact_versions
      set status = ${status}
      where id = ${id}
      returning *
    `;
    return parseVersion(requireRow(rows, 'updateArtifactVersionStatus'));
  }
  const rows = await sql<ArtifactVersionRow[]>`
    update artifact_versions
    set status = ${status}, citations_json = ${jsonParam(sql, citations)}
    where id = ${id}
    returning *
  `;
  return parseVersion(requireRow(rows, 'updateArtifactVersionStatus'));
}

export async function countStaleArtifactVersions(sql: Sql, projectId: ProjectId): Promise<number> {
  const rows = await sql<{ count: string }[]>`
    select count(*)::text as count
    from artifact_versions av
    join artifacts a on a.id = av.artifact_id
    where a.project_id = ${projectId} and av.status = 'stale'
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function markDependentArtifactsStale(
  sql: Sql,
  projectId: ProjectId,
  artifactTypes: readonly ArtifactType[],
): Promise<void> {
  for (const artifactType of artifactTypes) {
    const artifact = await getArtifactByProjectAndType(sql, projectId, artifactType);
    if (artifact !== null) {
      await markCurrentArtifactVersionsStale(sql, artifact.id);
    }
  }
}

export async function listArtifactVersions(
  sql: Sql,
  artifactId: ArtifactId,
): Promise<ArtifactVersion[]> {
  const rows = await sql<ArtifactVersionRow[]>`
    select * from artifact_versions
    where artifact_id = ${artifactId}
    order by version_number desc
  `;
  return rows.map(parseVersion);
}

export async function updateArtifactCurrentVersion(
  sql: Sql,
  artifactId: ArtifactId,
  versionId: ArtifactVersion['id'],
): Promise<Artifact> {
  const rows = await sql<ArtifactRow[]>`
    update artifacts
    set current_version_id = ${versionId}
    where id = ${artifactId}
    returning *
  `;
  return parseArtifact(requireRow(rows, 'updateArtifactCurrentVersion'));
}

export async function markCurrentArtifactVersionsStale(
  sql: Sql,
  artifactId: ArtifactId,
): Promise<number> {
  const rows = await sql<{ id: string }[]>`
    update artifact_versions
    set status = 'stale'
    where artifact_id = ${artifactId} and status = 'current'
    returning id
  `;
  return rows.length;
}
