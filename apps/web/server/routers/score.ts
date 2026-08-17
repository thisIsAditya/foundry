import {
  ExplainScoreInputSchema,
  GetCurrentScoreInputSchema,
  GetScoreForRevisionInputSchema,
  GetScoreHistoryInputSchema,
} from '@foundry/api-contracts';

import { projectReadProcedure, router } from '../trpc';

export const scoreRouter = router({
  getCurrent: projectReadProcedure.input(GetCurrentScoreInputSchema).query(async ({ ctx }) => {
    return ctx.services.scoringService.getCurrent(ctx.project);
  }),
  getForRevision: projectReadProcedure
    .input(GetScoreForRevisionInputSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.scoringService.getForRevision(ctx.project.workspaceId, input.revisionId);
    }),
  getHistory: projectReadProcedure
    .input(GetScoreHistoryInputSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.scoringService.getHistory(ctx.project, input.limit);
    }),
  explain: projectReadProcedure.input(ExplainScoreInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.scoringService.explain(ctx.project, input.dimension);
  }),
});
