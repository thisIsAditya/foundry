import {
  AnswerClarificationInputSchema,
  CreateProjectInputSchema,
  GetMoneyRulesInputSchema,
  ListProjectsInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import {
  projectAnswerProcedure,
  projectReadProcedure,
  router,
  workspaceProcedure,
  workspaceReadProcedure,
} from '../trpc';

export const projectRouter = router({
  create: workspaceProcedure
    .meta({ invalidates: mutationInvalidations['project.create'] })
    .input(CreateProjectInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('workspaceProcedure requires a user actor');
      }
      return ctx.services.projectService.create(
        { userId: ctx.actor.userId, membership: ctx.membership },
        input,
      );
    }),
  list: workspaceReadProcedure.input(ListProjectsInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.projectService.list(ctx.membership, input.workspaceId);
  }),
  getDeskSummary: projectReadProcedure.input(GetMoneyRulesInputSchema).query(async ({ ctx }) => {
    return ctx.services.projectService.getDeskSummary({
      membership: ctx.membership,
      project: ctx.project,
    });
  }),
  answerClarification: projectAnswerProcedure
    .meta({ invalidates: mutationInvalidations['project.answerClarification'] })
    .input(AnswerClarificationInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('projectAnswerProcedure requires a user actor');
      }
      return ctx.services.projectService.answerClarification(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
        ctx.correlationId,
      );
    }),
});
