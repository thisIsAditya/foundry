import {
  NotificationEndpointSchema,
  type NotificationChannel,
  type NotificationEndpoint,
  type UserId,
  type WorkspaceId,
} from '@foundry/domain';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

type NotificationEndpointRow = {
  id: string;
  user_id: string;
  workspace_id: string;
  channel: string;
  target: string;
  consented_at: Date;
  revoked_at: Date | null;
};

export type InsertNotificationEndpoint = {
  userId: UserId;
  workspaceId: WorkspaceId;
  channel: NotificationChannel;
  target: string;
};

export function toNotificationEndpoint(row: NotificationEndpointRow): NotificationEndpoint {
  return NotificationEndpointSchema.parse({
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    channel: row.channel,
    target: row.target,
    consentedAt: row.consented_at,
    revokedAt: row.revoked_at,
  });
}

export async function insertNotificationEndpoint(
  sql: Sql,
  input: InsertNotificationEndpoint,
): Promise<NotificationEndpoint> {
  const rows = await sql<NotificationEndpointRow[]>`
    insert into notification_endpoints (user_id, workspace_id, channel, target)
    values (${input.userId}, ${input.workspaceId}, ${input.channel}, ${input.target})
    returning *
  `;
  return toNotificationEndpoint(requireRow(rows, 'insertNotificationEndpoint'));
}
