import {
  CitationIdSchema,
  ConfidenceSchema,
  BusinessModelSectionKeySchema,
  ProjectIdSchema,
  ResearchExtractionMethodSchema,
  ResearchFindingIdSchema,
  ResearchFindingSchema,
  SprintIdSchema,
  type ProjectId,
  type ResearchFinding,
} from '@foundry/domain';
import { z } from 'zod';

import { parseTextArray, parseUuidArray } from '../arrays.js';
import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const ResearchFindingRowSchema = z.object({
  id: ResearchFindingIdSchema,
  project_id: ProjectIdSchema,
  job_id: SprintIdSchema,
  claim: z.string(),
  citation_ids: z.unknown(),
  confidence_json: z.unknown(),
  affected_section_keys: z.unknown(),
  conflicts_with_finding_ids: z.unknown(),
  stale_at: z.coerce.date().nullable(),
  extraction_method: ResearchExtractionMethodSchema,
  created_at: z.coerce.date(),
});

type ResearchFindingRow = z.infer<typeof ResearchFindingRowSchema>;

export type InsertResearchFinding = {
  projectId: ProjectId;
  jobId: z.infer<typeof SprintIdSchema>;
  claim: string;
  citationIds?: z.infer<typeof CitationIdSchema>[];
  confidence: z.infer<typeof ConfidenceSchema>;
  affectedSectionKeys?: z.infer<typeof BusinessModelSectionKeySchema>[];
  conflictsWithFindingIds?: z.infer<typeof ResearchFindingIdSchema>[];
  extractionMethod: z.infer<typeof ResearchExtractionMethodSchema>;
};

export function toResearchFinding(row: ResearchFindingRow): ResearchFinding {
  return ResearchFindingSchema.parse({
    id: row.id,
    projectId: row.project_id,
    jobId: row.job_id,
    claim: row.claim,
    citationIds: parseUuidArray(row.citation_ids),
    confidence: ConfidenceSchema.parse(row.confidence_json),
    affectedSectionKeys: z
      .array(BusinessModelSectionKeySchema)
      .parse(parseTextArray(row.affected_section_keys)),
    conflictsWithFindingIds: parseUuidArray(row.conflicts_with_finding_ids),
    staleAt: row.stale_at,
    extractionMethod: row.extraction_method,
    createdAt: row.created_at,
  });
}

function parseResearchFinding(row: ResearchFindingRow): ResearchFinding {
  return toResearchFinding(ResearchFindingRowSchema.parse(row));
}

export async function insertResearchFinding(
  sql: Sql,
  input: InsertResearchFinding,
): Promise<ResearchFinding> {
  const rows = await sql<ResearchFindingRow[]>`
    insert into research_findings (
      project_id,
      job_id,
      claim,
      citation_ids,
      confidence_json,
      affected_section_keys,
      conflicts_with_finding_ids,
      extraction_method
    )
    values (
      ${input.projectId},
      ${input.jobId},
      ${input.claim},
      ${input.citationIds ?? []},
      ${jsonParam(sql, input.confidence)},
      ${input.affectedSectionKeys ?? []},
      ${input.conflictsWithFindingIds ?? []},
      ${input.extractionMethod}
    )
    returning *
  `;
  return parseResearchFinding(requireRow(rows, 'insertResearchFinding'));
}

export async function listResearchFindingsByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<ResearchFinding[]> {
  const rows = await sql<ResearchFindingRow[]>`
    select * from research_findings where project_id = ${projectId} order by created_at desc
  `;
  return rows.map(parseResearchFinding);
}

export async function listResearchFindingsByJobId(
  sql: Sql,
  jobId: z.infer<typeof SprintIdSchema>,
): Promise<ResearchFinding[]> {
  const rows = await sql<ResearchFindingRow[]>`
    select * from research_findings where job_id = ${jobId} order by created_at desc
  `;
  return rows.map(parseResearchFinding);
}
