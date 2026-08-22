import {
  CapabilityGateway,
  hashCapabilityToken,
  resolveCapabilityId,
} from '@foundry/cofounder-operations';
import {
  getCapabilityTokenByHash,
  getProjectById,
  incrementCapabilityTokenUse,
  listWorkspaceMembershipsByUserId,
  withWorkspaceScope,
} from '@foundry/db';
import { CofounderOperationIdSchema, WorkspaceIdSchema } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import { z } from 'zod';

import { getEnv } from '../../../../../lib/env';
import { getSql } from '../../../../../lib/sql';

const BodySchema = z.object({
  name: z.string().min(1),
  input: z.unknown(),
  operationId: CofounderOperationIdSchema,
  workspaceId: WorkspaceIdSchema,
});

export async function POST(request: Request): Promise<Response> {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
  if (token.length === 0) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'invalid_input' }, { status: 400 });
  }
  const sql = getSql();
  try {
    const prepared = await withWorkspaceScope(sql, [parsed.data.workspaceId], async (tx) => {
      const record = await getCapabilityTokenByHash(tx, hashCapabilityToken(token));
      if (
        record === null ||
        record.canceled ||
        record.expiresAt.getTime() <= Date.now() ||
        record.operationId !== parsed.data.operationId ||
        record.workspaceId !== parsed.data.workspaceId
      ) {
        throw new AppError({
          code: 'unauthorized',
          explanation: 'That capability token is not valid for this operation.',
          nextAction: 'Retry the co-founder turn.',
        });
      }
      const capabilityId = resolveCapabilityId(parsed.data.name);
      if (
        capabilityId === null ||
        (!record.allowedCapabilities.includes(capabilityId) &&
          !record.allowedCapabilities.includes(parsed.data.name))
      ) {
        throw new AppError({
          code: 'capability_unsupported',
          explanation: 'That action is not available to the co-founder.',
          nextAction: 'Use a listed draft or read capability.',
        });
      }
      const used = await incrementCapabilityTokenUse(tx, hashCapabilityToken(token));
      if (used === null) {
        throw new AppError({
          code: 'rate_limited',
          explanation: 'This co-founder turn has used its capability budget.',
          nextAction: 'Continue from the current result, or send a new message.',
        });
      }
      const project = await getProjectById(tx, record.projectId);
      if (project === null || project.workspaceId !== record.workspaceId) {
        throw new AppError({
          code: 'not_found',
          explanation: 'That venture was not found for this capability call.',
          nextAction: 'Retry from the co-founder view.',
        });
      }
      return { record, project, capabilityId };
    });
    const memberships = await listWorkspaceMembershipsByUserId(sql, prepared.record.actorUserId);
    const membership = memberships.find((item) => item.workspaceId === prepared.record.workspaceId);
    if (membership === undefined) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'The actor is not a member of this workspace.',
        nextAction: 'Retry as a workspace member.',
      });
    }
    const gateway = new CapabilityGateway(sql, new PolicyService(), fetch, getEnv().EXA_API_KEY);
    const result = await gateway.invoke(
      {
        userId: prepared.record.actorUserId,
        membership,
        project: prepared.project,
        operationId: prepared.record.operationId,
      },
      prepared.capabilityId,
      parsed.data.input,
    );
    return Response.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      const status =
        error.code === 'unauthorized'
          ? 401
          : error.code === 'policy_forbidden' || error.code === 'capability_unsupported'
            ? 403
            : error.code === 'rate_limited'
              ? 429
              : 400;
      return Response.json(
        { error: error.code, explanation: error.explanation, nextAction: error.nextAction },
        { status },
      );
    }
    return Response.json({ error: 'capability_failed' }, { status: 500 });
  }
}
