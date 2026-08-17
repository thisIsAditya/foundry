import { randomUUID } from 'node:crypto';

import { CreateWorkspaceInputSchema } from '@foundry/api-contracts';
import { listWorkspaceMembershipsByUserId } from '@foundry/db';
import { after } from 'next/server';

import { getEnv } from '../../lib/env';
import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { protectedProcedure, router } from '../trpc';

export const workspaceRouter = router({
  create: protectedProcedure
    .meta({ invalidates: mutationInvalidations['workspace.create'] })
    .input(CreateWorkspaceInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('protectedProcedure requires a user actor');
      }
      const userId = ctx.actor.userId;
      const workspace = await ctx.services.workspaceService.create(userId, input);
      const env = getEnv();
      const ollamaBaseUrl = env.OLLAMA_BASE_URL;
      if (env.NODE_ENV !== 'test' && ollamaBaseUrl !== undefined) {
        const memberships = await listWorkspaceMembershipsByUserId(ctx.sql, userId);
        const membership = memberships.find((item) => item.workspaceId === workspace.id);
        if (membership !== undefined) {
          const modelId = env.OLLAMA_MODEL ?? 'gemma4:e4b';
          const providerService = ctx.services.providerService;
          after(() =>
            providerService
              .connect(
                { userId, membership },
                {
                  workspaceId: workspace.id,
                  family: 'ollama',
                  authMode: 'none',
                  endpointOrRegion: ollamaBaseUrl,
                  modelId,
                  idempotencyKey: randomUUID(),
                },
              )
              .catch(() => undefined),
          );
        }
      }
      return workspace;
    }),
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.actor.type !== 'user') {
      throw new Error('protectedProcedure requires a user actor');
    }
    return ctx.services.workspaceService.list(ctx.actor.memberships);
  }),
});
