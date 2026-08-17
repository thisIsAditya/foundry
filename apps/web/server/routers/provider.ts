import {
  ConnectProviderInputSchema,
  ListProviderConnectionsInputSchema,
} from '@foundry/api-contracts';

import { providerReadProcedure, providerWriteProcedure, router } from '../trpc';

export const providerRouter = router({
  listConnections: providerReadProcedure
    .input(ListProviderConnectionsInputSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.providerService.listConnections(ctx.membership, input.workspaceId);
    }),
  connect: providerWriteProcedure
    .meta({ invalidates: ['provider.listConnections'] })
    .input(ConnectProviderInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('providerWriteProcedure requires a user actor');
      }
      return ctx.services.providerService.connect(
        { userId: ctx.actor.userId, membership: ctx.membership },
        input,
      );
    }),
});
