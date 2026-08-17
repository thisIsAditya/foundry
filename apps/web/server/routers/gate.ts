import { EvaluateGateInputSchema } from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { metricWriteProcedure, router } from '../trpc';

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
