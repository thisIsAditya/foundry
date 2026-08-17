import {
  GetJobInputSchema,
  ListJobsInputSchema,
  RetryJobInputSchema,
  UpdateJobSettingsInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { router, sprintReadByProjectProcedure, sprintWriteProcedure } from '../trpc';

export const jobRouter = router({
  list: sprintReadByProjectProcedure.input(ListJobsInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.jobService.list(
      { membership: ctx.membership, project: ctx.project },
      input.view,
    );
  }),
  get: sprintReadByProjectProcedure.input(GetJobInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.jobService.get(
      { membership: ctx.membership, project: ctx.project },
      input.jobId,
    );
  }),
  updateSettings: sprintWriteProcedure
    .meta({ invalidates: mutationInvalidations['job.updateSettings'] })
    .input(UpdateJobSettingsInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('job.updateSettings requires a user actor');
      }
      return ctx.services.jobService.updateSettings(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  retry: sprintWriteProcedure
    .meta({ invalidates: mutationInvalidations['job.retry'] })
    .input(RetryJobInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('job.retry requires a user actor');
      }
      return ctx.services.jobService.retry(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input.jobId,
        input.idempotencyKey,
      );
    }),
});
