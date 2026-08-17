import { ExportPackInputSchema } from '@foundry/api-contracts';

import { artifactReadProcedure, router } from '../trpc';

export const packRouter = router({
  export: artifactReadProcedure
    .meta({ invalidates: [] })
    .input(ExportPackInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('pack.export requires a user actor');
      }
      return ctx.services.artifactService.exportPack(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
});
