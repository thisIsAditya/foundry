import {
  CreateExperimentInputSchema,
  EvaluateGateBInputSchema,
  GetMoneyRulesInputSchema,
  RecordWtpEventInputSchema,
} from '@foundry/api-contracts';

import { moneyReadProcedure, moneyWriteProcedure, router } from '../trpc';

export const wtpRouter = router({
  createExperiment: moneyWriteProcedure
    .meta({ invalidates: ['wtp.list'] })
    .input(CreateExperimentInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('moneyWriteProcedure requires a user actor');
      }
      return ctx.services.experimentService.create(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  record: moneyWriteProcedure
    .meta({ invalidates: ['wtp.list'] })
    .input(RecordWtpEventInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('moneyWriteProcedure requires a user actor');
      }
      return ctx.services.experimentService.recordWtp(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  list: moneyReadProcedure.input(GetMoneyRulesInputSchema).query(async ({ ctx }) => {
    return ctx.services.experimentService.listWtp({
      membership: ctx.membership,
      project: ctx.project,
    });
  }),
  evaluateGateB: moneyWriteProcedure
    .meta({ invalidates: ['wtp.list'] })
    .input(EvaluateGateBInputSchema)
    .mutation(async ({ ctx }) => {
      return ctx.services.experimentService.evaluateGateB({
        membership: ctx.membership,
        project: ctx.project,
      });
    }),
});
