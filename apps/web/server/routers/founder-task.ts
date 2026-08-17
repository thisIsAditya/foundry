import {
  CompleteFounderTaskInputSchema,
  DeferOrSkipFounderTaskInputSchema,
  GetFounderTaskInputSchema,
  ListFounderTasksInputSchema,
  RequestFounderTaskHelpInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { projectAnswerProcedure, projectReadProcedure, router } from '../trpc';

export const founderTaskRouter = router({
  list: projectReadProcedure.input(ListFounderTasksInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.founderTaskService.list(
      { membership: ctx.membership, project: ctx.project },
      input.status,
    );
  }),
  get: projectReadProcedure.input(GetFounderTaskInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.founderTaskService.get(
      { membership: ctx.membership, project: ctx.project },
      input.founderTaskId,
    );
  }),
  requestHelp: projectAnswerProcedure
    .meta({ invalidates: mutationInvalidations['founderTask.requestHelp'] })
    .input(RequestFounderTaskHelpInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('founderTask.requestHelp requires a user actor');
      }
      return ctx.services.founderTaskService.requestHelp(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input.founderTaskId,
        input.idempotencyKey,
      );
    }),
  complete: projectAnswerProcedure
    .meta({ invalidates: mutationInvalidations['founderTask.complete'] })
    .input(CompleteFounderTaskInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('founderTask.complete requires a user actor');
      }
      return ctx.services.founderTaskService.complete(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input.founderTaskId,
        input.evidenceRef,
        input.idempotencyKey,
      );
    }),
  defer: projectAnswerProcedure
    .meta({ invalidates: mutationInvalidations['founderTask.defer'] })
    .input(DeferOrSkipFounderTaskInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('founderTask.defer requires a user actor');
      }
      return ctx.services.founderTaskService.deferOrSkip(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input.founderTaskId,
        'deferred',
        input.reason,
        input.idempotencyKey,
      );
    }),
  skip: projectAnswerProcedure
    .meta({ invalidates: mutationInvalidations['founderTask.skip'] })
    .input(DeferOrSkipFounderTaskInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('founderTask.skip requires a user actor');
      }
      return ctx.services.founderTaskService.deferOrSkip(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input.founderTaskId,
        'skipped',
        input.reason,
        input.idempotencyKey,
      );
    }),
});
