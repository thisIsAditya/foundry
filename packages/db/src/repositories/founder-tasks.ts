import {
  BusinessModelSectionKeySchema,
  ConversationReferenceSchema,
  FounderTaskEvidenceSchema,
  FounderTaskIdSchema,
  FounderTaskPreparationSchema,
  FounderTaskSchema,
  FounderTaskStatusSchema,
  ProjectIdSchema,
  ScoreDimensionSchema,
  SprintIdSchema,
  type FounderTask,
  type FounderTaskStatus,
  type ProjectId,
} from '@foundry/domain';
import { z } from 'zod';

import { parseTextArray } from '../arrays.js';
import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const FounderTaskRowSchema = z.object({
  id: FounderTaskIdSchema,
  project_id: ProjectIdSchema,
  title: z.string(),
  explanation: z.string(),
  linked_job_id: SprintIdSchema.nullable(),
  linked_section_keys: z.unknown(),
  linked_score_dimensions: z.unknown(),
  preparation_json: z.unknown(),
  evidence_schema_json: z.unknown(),
  status: FounderTaskStatusSchema,
  due_or_suggested_at: z.coerce.date().nullable(),
  defer_or_skip_reason: z.string().nullable(),
  completion_evidence_ref: z.unknown().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

type FounderTaskRow = z.infer<typeof FounderTaskRowSchema>;

export type InsertFounderTask = {
  projectId: ProjectId;
  title: string;
  explanation: string;
  linkedJobId?: z.infer<typeof SprintIdSchema> | null;
  linkedSectionKeys?: z.infer<typeof BusinessModelSectionKeySchema>[];
  linkedScoreDimensions?: z.infer<typeof ScoreDimensionSchema>[];
  preparation?: z.infer<typeof FounderTaskPreparationSchema>;
  evidenceSchema?: z.infer<typeof FounderTaskEvidenceSchema>;
  status?: FounderTaskStatus;
  dueOrSuggestedAt?: Date | null;
};

export function toFounderTask(row: FounderTaskRow): FounderTask {
  return FounderTaskSchema.parse({
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    explanation: row.explanation,
    owner: 'founder',
    linkedJobId: row.linked_job_id,
    linkedSectionKeys: z
      .array(BusinessModelSectionKeySchema)
      .parse(parseTextArray(row.linked_section_keys)),
    linkedScoreDimensions: z
      .array(ScoreDimensionSchema)
      .parse(parseTextArray(row.linked_score_dimensions)),
    preparation: FounderTaskPreparationSchema.parse(row.preparation_json),
    evidenceSchema: FounderTaskEvidenceSchema.parse(row.evidence_schema_json),
    status: row.status,
    dueOrSuggestedAt: row.due_or_suggested_at,
    deferOrSkipReason: row.defer_or_skip_reason,
    completionEvidenceRef:
      row.completion_evidence_ref === null
        ? null
        : ConversationReferenceSchema.parse(row.completion_evidence_ref),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function parseFounderTask(row: FounderTaskRow): FounderTask {
  return toFounderTask(FounderTaskRowSchema.parse(row));
}

export async function insertFounderTask(sql: Sql, input: InsertFounderTask): Promise<FounderTask> {
  const rows = await sql<FounderTaskRow[]>`
    insert into founder_tasks (
      project_id,
      title,
      explanation,
      linked_job_id,
      linked_section_keys,
      linked_score_dimensions,
      preparation_json,
      evidence_schema_json,
      status,
      due_or_suggested_at
    )
    values (
      ${input.projectId},
      ${input.title},
      ${input.explanation},
      ${input.linkedJobId ?? null},
      ${input.linkedSectionKeys ?? []},
      ${input.linkedScoreDimensions ?? []},
      ${jsonParam(sql, input.preparation ?? {})},
      ${jsonParam(sql, input.evidenceSchema ?? { description: input.title, requiredKinds: [] })},
      ${input.status ?? 'proposed'},
      ${input.dueOrSuggestedAt ?? null}
    )
    returning *
  `;
  return parseFounderTask(requireRow(rows, 'insertFounderTask'));
}

export async function listFounderTasksByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<FounderTask[]> {
  const rows = await sql<FounderTaskRow[]>`
    select * from founder_tasks where project_id = ${projectId} order by created_at desc
  `;
  return rows.map(parseFounderTask);
}

export async function getFounderTaskById(
  sql: Sql,
  id: z.infer<typeof FounderTaskIdSchema>,
): Promise<FounderTask | null> {
  const rows = await sql<FounderTaskRow[]>`
    select * from founder_tasks where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parseFounderTask(row);
}

export async function updateFounderTaskPreparation(
  sql: Sql,
  id: z.infer<typeof FounderTaskIdSchema>,
  preparation: z.infer<typeof FounderTaskPreparationSchema>,
): Promise<FounderTask> {
  const rows = await sql<FounderTaskRow[]>`
    update founder_tasks
    set preparation_json = ${jsonParam(sql, preparation)},
        updated_at = now()
    where id = ${id}
    returning *
  `;
  return parseFounderTask(requireRow(rows, 'updateFounderTaskPreparation'));
}

export async function updateFounderTaskCompletion(
  sql: Sql,
  id: z.infer<typeof FounderTaskIdSchema>,
  completionEvidenceRef: z.infer<typeof ConversationReferenceSchema>,
): Promise<FounderTask> {
  const rows = await sql<FounderTaskRow[]>`
    update founder_tasks
    set status = 'completed',
        completion_evidence_ref = ${jsonParam(sql, completionEvidenceRef)},
        updated_at = now()
    where id = ${id}
    returning *
  `;
  return parseFounderTask(requireRow(rows, 'updateFounderTaskCompletion'));
}

export async function updateFounderTaskStatus(
  sql: Sql,
  id: z.infer<typeof FounderTaskIdSchema>,
  status: FounderTaskStatus,
  deferOrSkipReason: string | null = null,
): Promise<FounderTask> {
  const rows = await sql<FounderTaskRow[]>`
    update founder_tasks
    set status = ${status},
        defer_or_skip_reason = ${deferOrSkipReason},
        updated_at = now()
    where id = ${id}
    returning *
  `;
  return parseFounderTask(requireRow(rows, 'updateFounderTaskStatus'));
}
