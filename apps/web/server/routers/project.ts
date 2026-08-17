import { CreateProjectInputSchema, ListProjectsInputSchema } from '@foundry/api-contracts';

import { router, workspaceProcedure, workspaceReadProcedure } from '../trpc';

export const projectRouter = router({
  create: workspaceProcedure
    .meta({ invalidates: ['project.list'] })
    .input(CreateProjectInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('workspaceProcedure requires a user actor');
      }
      return ctx.services.projectService.create(
        { userId: ctx.actor.userId, membership: ctx.membership },
        input,
      );
    }),
  list: workspaceReadProcedure.input(ListProjectsInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.projectService.list(ctx.membership, input.workspaceId);
  }),
});
