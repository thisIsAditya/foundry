import { CreateWorkspaceInputSchema } from '@foundry/api-contracts';

import { protectedProcedure, router } from '../trpc';

export const workspaceRouter = router({
  create: protectedProcedure
    .meta({ invalidates: ['workspace.list'] })
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
    return ctx.services.workspaceService.list(ctx.actor.memberships);
  }),
});
