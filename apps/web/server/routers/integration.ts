import {
  ConnectIntegrationInputSchema,
  ListIntegrationsInputSchema,
  RevokeIntegrationInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { integrationReadProcedure, integrationWriteProcedure, router } from '../trpc';

export const integrationRouter = router({
  list: integrationReadProcedure
    .input(ListIntegrationsInputSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.integrationService.list(ctx.membership, input.workspaceId);
    }),
  connect: integrationWriteProcedure
    .meta({ invalidates: mutationInvalidations['integration.connect'] })
    .input(ConnectIntegrationInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('integration.connect requires a user actor');
      }
      return ctx.services.integrationService.connect(
        { userId: ctx.actor.userId, membership: ctx.membership },
        input,
      );
    }),
  revoke: integrationWriteProcedure
    .meta({ invalidates: mutationInvalidations['integration.revoke'] })
    .input(RevokeIntegrationInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('integration.revoke requires a user actor');
      }
      return ctx.services.integrationService.revoke(
        { userId: ctx.actor.userId, membership: ctx.membership },
        input.workspaceId,
        input.integrationId,
        input.idempotencyKey,
      );
    }),
});
