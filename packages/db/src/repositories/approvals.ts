import {
  ApprovalActionTypeSchema,
  ApprovalRequestIdSchema,
  ApprovalRequestSchema,
  ApprovalStatusSchema,
  ProjectIdSchema,
  UserIdSchema,
  type ApprovalActionType,
  type ApprovalRequest,
  type ApprovalStatus,
  type ProjectId,
  type UserId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const ApprovalRequestRowSchema = z.object({
  id: ApprovalRequestIdSchema,
  project_id: ProjectIdSchema,
  action_type: ApprovalActionTypeSchema,
  payload_json: z.unknown(),
  payload_hash: z.string(),
  status: ApprovalStatusSchema,
  requested_by: z.string(),
  decided_by_user_id: UserIdSchema.nullable(),
  expires_at: z.coerce.date(),
  created_at: z.coerce.date(),
  decided_at: z.coerce.date().nullable(),
});

type ApprovalRequestRow = z.infer<typeof ApprovalRequestRowSchema>;

export type InsertApprovalRequest = {
  projectId: ProjectId;
  actionType: ApprovalActionType;
  payload: unknown;
  payloadHash: string;
  requestedBy: string;
  expiresAt: Date;
};

export function toApprovalRequest(row: ApprovalRequestRow): ApprovalRequest {
  return ApprovalRequestSchema.parse({
    id: row.id,
    projectId: row.project_id,
    actionType: row.action_type,
    payload: row.payload_json,
    payloadHash: row.payload_hash,
    status: row.status,
    requestedBy: row.requested_by,
    decidedByUserId: row.decided_by_user_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  });
}

function parseApproval(row: ApprovalRequestRow): ApprovalRequest {
  return toApprovalRequest(ApprovalRequestRowSchema.parse(row));
}

export async function insertApprovalRequest(
  sql: Sql,
  input: InsertApprovalRequest,
): Promise<ApprovalRequest> {
  const rows = await sql<ApprovalRequestRow[]>`
    insert into approval_requests (
      project_id, action_type, payload_json, payload_hash, requested_by, expires_at
    )
    values (
      ${input.projectId},
      ${input.actionType},
      ${jsonParam(sql, input.payload)},
      ${input.payloadHash},
      ${input.requestedBy},
      ${input.expiresAt}
    )
    returning *
  `;
  return parseApproval(requireRow(rows, 'insertApprovalRequest'));
}

export async function getApprovalRequestById(
  sql: Sql,
  id: ApprovalRequest['id'],
): Promise<ApprovalRequest | null> {
  const rows = await sql<ApprovalRequestRow[]>`
    select * from approval_requests where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parseApproval(row);
}

export async function listApprovalRequestsByProjectId(
  sql: Sql,
  projectId: ProjectId,
  status?: ApprovalStatus,
): Promise<ApprovalRequest[]> {
  const rows =
    status === undefined
      ? await sql<ApprovalRequestRow[]>`
          select * from approval_requests
          where project_id = ${projectId}
          order by created_at desc
        `
      : await sql<ApprovalRequestRow[]>`
          select * from approval_requests
          where project_id = ${projectId} and status = ${status}
          order by created_at desc
        `;
  return rows.map(parseApproval);
}

export async function updateApprovalRequestDecision(
  sql: Sql,
  id: ApprovalRequest['id'],
  status: ApprovalStatus,
  decidedByUserId: UserId | null,
): Promise<ApprovalRequest> {
  const rows = await sql<ApprovalRequestRow[]>`
    update approval_requests
    set status = ${status},
        decided_by_user_id = ${decidedByUserId},
        decided_at = now()
    where id = ${id}
    returning *
  `;
  return parseApproval(requireRow(rows, 'updateApprovalRequestDecision'));
}
