import {
  CitationIdSchema,
  EvidenceItemIdSchema,
  EvidenceItemSchema,
  ProjectIdSchema,
  ProvenanceSchema,
  type EvidenceItem,
  type ProjectId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const EvidenceItemRowSchema = z.object({
  id: EvidenceItemIdSchema,
  project_id: ProjectIdSchema,
  summary: z.string(),
  provenance_json: z.unknown(),
  created_at: z.coerce.date(),
});

type EvidenceItemRow = z.infer<typeof EvidenceItemRowSchema>;

export type InsertEvidenceItem = {
  projectId: ProjectId;
  summary: string;
  provenance: z.infer<typeof ProvenanceSchema>;
  citationIds?: z.infer<typeof CitationIdSchema>[];
};

async function loadCitationIds(
  sql: Sql,
  evidenceItemId: z.infer<typeof EvidenceItemIdSchema>,
): Promise<string[]> {
  const rows = await sql<{ citation_id: string }[]>`
    select citation_id from evidence_item_citations where evidence_item_id = ${evidenceItemId}
  `;
  return rows.map((row) => row.citation_id);
}

export function toEvidenceItem(row: EvidenceItemRow, citationIds: string[]): EvidenceItem {
  return EvidenceItemSchema.parse({
    id: row.id,
    projectId: row.project_id,
    summary: row.summary,
    provenance: ProvenanceSchema.parse(row.provenance_json),
    citationIds,
    createdAt: row.created_at,
  });
}

function parseEvidenceItem(row: EvidenceItemRow, citationIds: string[]): EvidenceItem {
  return toEvidenceItem(EvidenceItemRowSchema.parse(row), citationIds);
}

export async function insertEvidenceItem(
  sql: Sql,
  input: InsertEvidenceItem,
): Promise<EvidenceItem> {
  const rows = await sql<EvidenceItemRow[]>`
    insert into evidence_items (project_id, summary, provenance_json)
    values (
      ${input.projectId},
      ${input.summary},
      ${jsonParam(sql, input.provenance)}
    )
    returning *
  `;
  const row = requireRow(rows, 'insertEvidenceItem');
  const citationIds = input.citationIds ?? [];
  for (const citationId of citationIds) {
    await sql`
      insert into evidence_item_citations (evidence_item_id, citation_id)
      values (${row.id}, ${citationId})
    `;
  }
  return parseEvidenceItem(row, citationIds);
}

export async function listEvidenceItemsByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<EvidenceItem[]> {
  const rows = await sql<EvidenceItemRow[]>`
    select * from evidence_items where project_id = ${projectId} order by created_at desc
  `;
  return Promise.all(
    rows.map(async (row) => parseEvidenceItem(row, await loadCitationIds(sql, row.id))),
  );
}
