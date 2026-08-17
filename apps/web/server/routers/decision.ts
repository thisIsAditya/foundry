import { ListDecisionsInputSchema, RecordDecisionInputSchema } from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { approvalReadProcedure, approvalWriteProcedure, router } from '../trpc';

export const decisionRouter = router({
  list: approvalReadProcedure.input(ListDecisionsInputSchema).query(async ({ ctx }) => {
    return ctx.services.decisionService.list({
      membership: ctx.membership,
      project: ctx.project,
    });
  }),
  record: approvalWriteProcedure
    .meta({ invalidates: mutationInvalidations['decision.record'] })
    .input(RecordDecisionInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('decision.record requires a user actor');
      }
      return ctx.services.decisionService.record(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
});
