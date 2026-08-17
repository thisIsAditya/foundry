import {
  GetMoneyRulesInputSchema,
  SetMoneyRulesInputSchema,
  UpsertMarketModelInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { moneyReadProcedure, moneyWriteProcedure, router } from '../trpc';

export const moneyRulesRouter = router({
  getCurrent: moneyReadProcedure.input(GetMoneyRulesInputSchema).query(async ({ ctx }) => {
    return ctx.services.moneyRulesService.getCurrent({
      membership: ctx.membership,
      project: ctx.project,
    });
  }),
  setCurrent: moneyWriteProcedure
    .meta({ invalidates: mutationInvalidations['moneyRules.setCurrent'] })
    .input(SetMoneyRulesInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('moneyWriteProcedure requires a user actor');
      }
      return ctx.services.moneyRulesService.setCurrent(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  upsertMarket: moneyWriteProcedure
    .meta({ invalidates: mutationInvalidations['moneyRules.upsertMarket'] })
    .input(UpsertMarketModelInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('moneyWriteProcedure requires a user actor');
      }
      return ctx.services.moneyRulesService.upsertMarket(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
});
