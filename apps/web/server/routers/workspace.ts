import { CreateWorkspaceInputSchema } from '@foundry/api-contracts';
import { listWorkspaceMembershipsByUserId } from '@foundry/db';

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
      return ctx.services.workspaceService.create(ctx.actor.userId, input);
    }),
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.actor.type !== 'user') {
      throw new Error('protectedProcedure requires a user actor');
    }
    const memberships = await listWorkspaceMembershipsByUserId(ctx.sql, ctx.actor.userId);
    return ctx.services.workspaceService.list(memberships);
  }),
});
