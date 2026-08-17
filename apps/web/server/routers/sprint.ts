import {
  ApproveSprintPlanInputSchema,
  GetSprintActivityInputSchema,
  GetSprintInputSchema,
  PreviewSprintInputSchema,
} from '@foundry/api-contracts';

import { router, sprintApproveProcedure, sprintReadProcedure, sprintWriteProcedure } from '../trpc';

export const sprintRouter = router({
  preview: sprintWriteProcedure
    .meta({ invalidates: ['sprint.getContract'] })
    .input(PreviewSprintInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('sprintWriteProcedure requires a user actor');
      }
      return ctx.services.sprintService.preview(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  approvePlan: sprintApproveProcedure
    .meta({ invalidates: ['sprint.getContract', 'sprint.getActivity'] })
    .input(ApproveSprintPlanInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('sprintApproveProcedure requires a user actor');
      }
      return ctx.services.sprintService.approvePlan(
        { userId: ctx.actor.userId, membership: ctx.membership },
        input.sprintId,
        input.expectedContractHash,
        ctx.correlationId,
      );
    }),
  getContract: sprintReadProcedure.input(GetSprintInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.sprintService.getContract(ctx.membership, input.sprintId);
  }),
  getActivity: sprintReadProcedure
    .input(GetSprintActivityInputSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.sprintService.getActivity(
        ctx.membership,
        input.sprintId,
        input.cursor ?? 0,
      );
    }),
});
