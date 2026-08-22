import {
  ProjectIdSchema,
  ProposalChangeIdSchema,
  ProposalChangeOutcomeSchema,
  ProposalChangeSchema,
  ProposalIdSchema,
  RecordSectionKeySchema,
  WorkspaceIdSchema,
  type ProjectId,
  type ProposalChange,
  type ProposalChangeId,
  type ProposalChangeOutcome,
  type ProposalId,
  type RecordItemId,
  type RecordSectionKey,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const RowSchema = z.object({
  id: ProposalChangeIdSchema,
  proposal_id: ProposalIdSchema,
  project_id: ProjectIdSchema,
  workspace_id: WorkspaceIdSchema,
  record_item_id: z.string().uuid().nullable(),
  section: RecordSectionKeySchema,
  item_key: z.string().nullable(),
  before_payload: z.unknown().nullable(),
  after_payload: z.unknown(),
  evidence_refs: z.unknown(),
  selected_outcome: ProposalChangeOutcomeSchema.nullable(),
  conflict_revision: z.number().int().nullable(),
  created_at: z.coerce.date(),
});

type Row = z.infer<typeof RowSchema>;

export type InsertProposalChangeV4 = {
  proposalId: ProposalId;
  projectId: ProjectId;
  workspaceId: WorkspaceId;
  recordItemId?: RecordItemId | null;
  section: RecordSectionKey;
  itemKey?: string | null;
  beforePayload?: unknown;
  afterPayload: unknown;
  evidenceRefs?: unknown;
};

export function toProposalChangeV4(row: Row): ProposalChange {
  return ProposalChangeSchema.parse({
    id: row.id,
    proposalId: row.proposal_id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    recordItemId: row.record_item_id,
    section: row.section,
    itemKey: row.item_key,
    beforePayload: row.before_payload,
    afterPayload: row.after_payload,
    evidenceRefs: row.evidence_refs,
    selectedOutcome: row.selected_outcome,
    conflictRevision: row.conflict_revision,
    createdAt: row.created_at,
  });
}

function parse(row: Row): ProposalChange {
  return toProposalChangeV4(RowSchema.parse(row));
}

export async function insertProposalChangeV4(
  sql: Sql,
  input: InsertProposalChangeV4,
): Promise<ProposalChange> {
  const rows = await sql<Row[]>`
    insert into proposal_changes_v4 (
      proposal_id,
      project_id,
      workspace_id,
      record_item_id,
      section,
      item_key,
      before_payload,
      after_payload,
      evidence_refs
    )
    values (
      ${input.proposalId},
      ${input.projectId},
      ${input.workspaceId},
      ${input.recordItemId ?? null},
      ${input.section},
      ${input.itemKey ?? null},
      ${input.beforePayload === undefined ? null : jsonParam(sql, input.beforePayload)},
      ${jsonParam(sql, input.afterPayload)},
      ${jsonParam(sql, input.evidenceRefs ?? [])}
    )
    returning *
  `;
  return parse(requireRow(rows, 'insertProposalChangeV4'));
}

export async function listProposalChangesV4(
  sql: Sql,
  proposalId: ProposalId,
): Promise<ProposalChange[]> {
  const rows = await sql<Row[]>`
    select * from proposal_changes_v4 where proposal_id = ${proposalId} order by created_at asc
  `;
  return rows.map(parse);
}

export async function updateProposalChangeOutcome(
  sql: Sql,
  id: ProposalChangeId,
  input: { outcome: ProposalChangeOutcome; afterPayload?: unknown },
): Promise<ProposalChange> {
  const rows = await sql<Row[]>`
    update proposal_changes_v4
    set
      selected_outcome = ${input.outcome},
      after_payload = coalesce(
        ${input.afterPayload === undefined ? null : jsonParam(sql, input.afterPayload)},
        after_payload
      )
    where id = ${id}
    returning *
  `;
  return parse(requireRow(rows, 'updateProposalChangeOutcome'));
}
