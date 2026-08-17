import { insertDomainEvent } from '@foundry/db';
import { WorkspaceIdSchema, type WorkspaceId } from '@foundry/domain';
import { getLogger } from '@foundry/observability';

import type { Context } from '../context';

export function workspaceIdFrom(input: unknown, data: unknown): WorkspaceId | undefined {
  const fromInput = WorkspaceIdSchema.safeParse(
    input !== null && typeof input === 'object' && 'workspaceId' in input
      ? input.workspaceId
      : undefined,
  );
  if (fromInput.success) {
    return fromInput.data;
  }
  if (data !== null && typeof data === 'object') {
    if ('workspaceId' in data) {
      const parsed = WorkspaceIdSchema.safeParse(data.workspaceId);
      if (parsed.success) {
        return parsed.data;
      }
    }
    if ('id' in data && 'ownerUserId' in data) {
      const parsed = WorkspaceIdSchema.safeParse(data.id);
      if (parsed.success) {
        return parsed.data;
      }
    }
  }
  return undefined;
}

export async function writeAudit(opts: {
  ctx: Context;
  path: string;
  input: unknown;
  data: unknown;
  ok: boolean;
  errorCode: string | undefined;
}): Promise<void> {
  const workspaceId = workspaceIdFrom(opts.input, opts.data);
  if (workspaceId === undefined) {
    getLogger().info({
      msg: 'audit skipped; no workspace id',
      path: opts.path,
      correlationId: opts.ctx.correlationId,
      ok: opts.ok,
      errorCode: opts.errorCode,
    });
    return;
  }

  await insertDomainEvent(opts.ctx.sql, {
    eventType: opts.path,
    workspaceId,
    actorType: 'founder',
    actorId: opts.ctx.actor.type === 'user' ? opts.ctx.actor.userId : null,
    correlationId: opts.ctx.correlationId,
    payload: { ok: opts.ok, errorCode: opts.errorCode, path: opts.path },
  });
}
