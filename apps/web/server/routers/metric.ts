import {
  DefineMetricInputSchema,
  EvaluateGateInputSchema,
  ListMetricsInputSchema,
  RecordMetricObservationInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { metricReadProcedure, metricWriteProcedure, router } from '../trpc';

export const metricRouter = router({
  listDefinitions: metricReadProcedure.input(ListMetricsInputSchema).query(async ({ ctx }) => {
    return ctx.services.metricService.listDefinitions({
      membership: ctx.membership,
      project: ctx.project,
    });
  }),
  listObservations: metricReadProcedure.input(ListMetricsInputSchema).query(async ({ ctx }) => {
    return ctx.services.metricService.listObservations({
      membership: ctx.membership,
      project: ctx.project,
    });
  }),
  define: metricWriteProcedure
    .meta({ invalidates: mutationInvalidations['metric.define'] })
    .input(DefineMetricInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('metric.define requires a user actor');
      }
      return ctx.services.metricService.define(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  recordObservation: metricWriteProcedure
    .meta({ invalidates: mutationInvalidations['metric.recordObservation'] })
    .input(RecordMetricObservationInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('metric.recordObservation requires a user actor');
      }
      return ctx.services.metricService.recordObservation(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
});

export const gateRouter = router({
  evaluate: metricWriteProcedure
    .meta({ invalidates: mutationInvalidations['gate.evaluate'] })
    .input(EvaluateGateInputSchema)
    .mutation(async ({ ctx }) => {
      return ctx.services.metricService.evaluateGateC({
        membership: ctx.membership,
        project: ctx.project,
      });
    }),
});
