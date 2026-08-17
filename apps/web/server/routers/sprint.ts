import {
  ApproveSprintPlanInputSchema,
  ControlSprintInputSchema,
  GetSprintActivityInputSchema,
  GetSprintInputSchema,
  ListSprintsInputSchema,
  PreviewSprintInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import {
  router,
  sprintApproveProcedure,
  sprintReadByProjectProcedure,
  sprintReadProcedure,
  sprintWriteProcedure,
} from '../trpc';

export const sprintRouter = router({
  listByProject: sprintReadByProjectProcedure
    .input(ListSprintsInputSchema)
    .query(async ({ ctx }) => {
      return ctx.services.sprintService.listByProject({
        membership: ctx.membership,
        project: ctx.project,
      });
    }),
  preview: sprintWriteProcedure
    .meta({ invalidates: mutationInvalidations['sprint.preview'] })
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
    .meta({ invalidates: mutationInvalidations['sprint.approvePlan'] })
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
  pause: sprintApproveProcedure
    .meta({ invalidates: mutationInvalidations['sprint.pause'] })
    .input(ControlSprintInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('sprint.pause requires a user actor');
      }
      return ctx.services.sprintService.control(
        { userId: ctx.actor.userId, membership: ctx.membership },
        input.sprintId,
        'paused',
        input.idempotencyKey,
      );
    }),
  resume: sprintApproveProcedure
    .meta({ invalidates: mutationInvalidations['sprint.resume'] })
    .input(ControlSprintInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('sprint.resume requires a user actor');
      }
      return ctx.services.sprintService.control(
        { userId: ctx.actor.userId, membership: ctx.membership },
        input.sprintId,
        'running',
        input.idempotencyKey,
      );
    }),
  stop: sprintApproveProcedure
    .meta({ invalidates: mutationInvalidations['sprint.stop'] })
    .input(ControlSprintInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('sprint.stop requires a user actor');
      }
      return ctx.services.sprintService.control(
        { userId: ctx.actor.userId, membership: ctx.membership },
        input.sprintId,
        'closed',
        input.idempotencyKey,
      );
    }),
});
