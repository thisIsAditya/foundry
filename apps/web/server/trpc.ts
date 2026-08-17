import { getProjectById, withWorkspaceScope } from '@foundry/db';
import {
  ProjectIdSchema,
  WorkspaceIdSchema,
  type Project,
  type WorkspaceId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { type AppErrorCode, AppError, isAppError } from '@foundry/observability';
import type { PolicyAction } from '@foundry/policy';
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { z } from 'zod';

import type { Context } from './context';
import { writeAudit } from './middleware/audit';
import { enforceRateLimit } from './middleware/rate-limit';

export type ProcedureMeta = {
  invalidates?: string[];
};

export type WorkspaceContext = Context & {
  workspaceId: WorkspaceId;
  membership: WorkspaceMembership;
};

export type ProjectContext = WorkspaceContext & {
  project: Project;
};

function trpcCodeForAppError(code: AppErrorCode): TRPCError['code'] {
  switch (code) {
    case 'unauthorized':
      return 'UNAUTHORIZED';
    case 'not_found':
      return 'NOT_FOUND';
    case 'stale_revision':
      return 'CONFLICT';
    case 'document_rejected':
      return 'BAD_REQUEST';
    case 'invalid_input':
      return 'BAD_REQUEST';
    case 'missing_evidence':
    case 'gate_blocked':
    case 'policy_forbidden':
    case 'budget_exceeded':
      return 'FORBIDDEN';
    case 'approval_required':
      return 'PRECONDITION_FAILED';
    case 'rate_limited':
      return 'TOO_MANY_REQUESTS';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

const t = initTRPC
  .context<Context>()
  .meta<ProcedureMeta>()
  .create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
      const app = isAppError(error.cause) ? error.cause : isAppError(error) ? error : undefined;
      return {
        ...shape,
        data: {
          ...shape.data,
          appError:
            app === undefined
              ? undefined
              : {
                  code: app.code,
                  explanation: app.explanation,
                  retryable: app.retryable,
                  nextAction: app.nextAction,
                  correlationId: app.correlationId,
                },
        },
      };
    },
  });

const mapAppError = t.middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok && isAppError(result.error.cause)) {
    const app = result.error.cause;
    if (result.error.code === 'INTERNAL_SERVER_ERROR') {
      throw new TRPCError({
        code: trpcCodeForAppError(app.code),
        message: app.explanation,
        cause: app,
      });
    }
  }
  return result;
});

const requireSession = t.middleware(async ({ ctx, next }) => {
  if (ctx.session === null || ctx.actor.type !== 'user') {
    throw new AppError({
      code: 'unauthorized',
      explanation: 'Sign in to continue.',
      nextAction: 'Authenticate and retry.',
      correlationId: ctx.correlationId,
    });
  }
  return next({ ctx });
});

function requireWorkspaceAccess(action: PolicyAction) {
  return t.middleware(async ({ ctx, input, getRawInput, next }) => {
    if (ctx.actor.type !== 'user') {
      throw new AppError({
        code: 'unauthorized',
        explanation: 'Sign in to continue.',
        nextAction: 'Authenticate and retry.',
        correlationId: ctx.correlationId,
      });
    }

    const rawInput =
      input !== null && typeof input === 'object' && 'workspaceId' in input
        ? input
        : await getRawInput();
    const parsed = z.object({ workspaceId: WorkspaceIdSchema }).safeParse(rawInput);
    if (!parsed.success) {
      throw new AppError({
        code: 'invalid_input',
        explanation: 'A workspaceId is required.',
        nextAction: 'Pass a valid workspaceId.',
        correlationId: ctx.correlationId,
      });
    }

    const membership =
      ctx.actor.memberships.find((item) => item.workspaceId === parsed.data.workspaceId) ?? null;
    if (membership === null) {
      throw new AppError({
        code: 'unauthorized',
        explanation: 'You do not have access to this workspace.',
        nextAction: 'Switch workspace or ask an owner to invite you.',
        correlationId: ctx.correlationId,
      });
    }
    if (!ctx.services.policyService.can(membership, action)) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot perform this action.',
        nextAction: 'Ask a workspace admin to change your role.',
        correlationId: ctx.correlationId,
      });
    }

    return next({
      ctx: {
        ...ctx,
        workspaceId: parsed.data.workspaceId,
        membership,
      },
    });
  });
}

function requireProjectAccess(action: PolicyAction) {
  return t.middleware(async ({ ctx, input, getRawInput, next }) => {
    if (ctx.actor.type !== 'user') {
      throw new AppError({
        code: 'unauthorized',
        explanation: 'Sign in to continue.',
        nextAction: 'Authenticate and retry.',
        correlationId: ctx.correlationId,
      });
    }

    const rawInput =
      input !== null && typeof input === 'object' && 'projectId' in input
        ? input
        : await getRawInput();
    const parsed = z.object({ projectId: ProjectIdSchema }).safeParse(rawInput);
    if (!parsed.success) {
      throw new AppError({
        code: 'invalid_input',
        explanation: 'A projectId is required.',
        nextAction: 'Pass a valid projectId.',
        correlationId: ctx.correlationId,
      });
    }

    const workspaceIds = ctx.actor.memberships.map((item) => item.workspaceId);
    const project = await withWorkspaceScope(ctx.sql, workspaceIds, async (tx) =>
      getProjectById(tx, parsed.data.projectId),
    );
    if (project === null) {
      throw new AppError({
        code: 'not_found',
        explanation: 'Project not found.',
        nextAction: 'Pick a project you have access to.',
        correlationId: ctx.correlationId,
      });
    }

    const membership =
      ctx.actor.memberships.find((item) => item.workspaceId === project.workspaceId) ?? null;
    if (membership === null) {
      throw new AppError({
        code: 'unauthorized',
        explanation: 'You do not have access to this workspace.',
        nextAction: 'Switch workspace or ask an owner to invite you.',
        correlationId: ctx.correlationId,
      });
    }
    if (!ctx.services.policyService.can(membership, action)) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot perform this action.',
        nextAction: 'Ask a workspace admin to change your role.',
        correlationId: ctx.correlationId,
      });
    }

    return next({
      ctx: {
        ...ctx,
        workspaceId: project.workspaceId,
        membership,
        project,
      },
    });
  });
}

const rateLimit = t.middleware(async ({ ctx, type, next }) => {
  await enforceRateLimit(ctx, type);
  return next();
});

const audit = t.middleware(async ({ ctx, path, type, input, getRawInput, next }) => {
  if (type !== 'mutation') {
    return next();
  }

  const rawInput = input !== null && typeof input === 'object' ? input : await getRawInput();

  try {
    const result = await next();
    await writeAudit({
      ctx,
      path,
      input: rawInput,
      data: result.ok ? result.data : undefined,
      ok: result.ok,
      errorCode: result.ok ? undefined : 'failed',
    });
    return result;
  } catch (error) {
    await writeAudit({
      ctx,
      path,
      input: rawInput,
      data: undefined,
      ok: false,
      errorCode: isAppError(error) ? error.code : 'internal',
    });
    throw error;
  }
});

export const router = t.router;
export const publicProcedure = t.procedure.use(mapAppError).use(rateLimit).use(audit);
export const protectedProcedure = publicProcedure.use(requireSession);
export const workspaceProcedure = protectedProcedure.use(requireWorkspaceAccess('project.create'));
export const workspaceReadProcedure = protectedProcedure.use(
  requireWorkspaceAccess('project.list'),
);
export const projectProcedure = protectedProcedure.use(requireProjectAccess('evidence.upload'));
export const projectReadProcedure = protectedProcedure.use(requireProjectAccess('evidence.read'));
