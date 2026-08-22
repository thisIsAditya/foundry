import {
  CancelCofounderOperationInputSchema,
  CofounderRespondInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { cofounderRespondProcedure, router } from '../trpc';

export const cofounderRouter = router({
  respond: cofounderRespondProcedure
    .meta({ invalidates: mutationInvalidations['cofounder.respond'] })
    .input(CofounderRespondInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('cofounder.respond requires a user actor');
      }
      return ctx.services.cofounderService.respond(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
        ctx.correlationId,
      );
    }),
  cancel: cofounderRespondProcedure
    .meta({ invalidates: mutationInvalidations['cofounder.cancel'] })
    .input(CancelCofounderOperationInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('cofounder.cancel requires a user actor');
      }
      await ctx.services.cofounderService.cancel(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input.operationId,
      );
      return { ok: true as const };
    }),
});
