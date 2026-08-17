import {
  DecideApprovalInputSchema,
  GetApprovalInputSchema,
  ListApprovalsInputSchema,
  RequestApprovalInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { approvalReadProcedure, approvalWriteProcedure, router } from '../trpc';

export const approvalRouter = router({
  list: approvalReadProcedure.input(ListApprovalsInputSchema).query(async ({ ctx, input }) => {
    if (input.status === undefined) {
      return ctx.services.approvalService.list({
        membership: ctx.membership,
        project: ctx.project,
      });
    }
    return ctx.services.approvalService.list(
      { membership: ctx.membership, project: ctx.project },
      input.status,
    );
  }),
  getPayload: approvalReadProcedure.input(GetApprovalInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.approvalService.getPayload(
      { membership: ctx.membership, project: ctx.project },
      input.approvalId,
    );
  }),
  request: approvalWriteProcedure
    .meta({ invalidates: mutationInvalidations['approval.request'] })
    .input(RequestApprovalInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('approval.request requires a user actor');
      }
      return ctx.services.approvalService.request(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  approve: approvalWriteProcedure
    .meta({ invalidates: mutationInvalidations['approval.approve'] })
    .input(DecideApprovalInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('approval.approve requires a user actor');
      }
      return ctx.services.approvalService.decide(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
        'approved',
        ctx.correlationId,
      );
    }),
  reject: approvalWriteProcedure
    .meta({ invalidates: mutationInvalidations['approval.reject'] })
    .input(DecideApprovalInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('approval.reject requires a user actor');
      }
      return ctx.services.approvalService.decide(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
        'rejected',
        ctx.correlationId,
      );
    }),
});
