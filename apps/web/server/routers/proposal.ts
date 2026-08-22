import {
  CreateProposalInputSchema,
  GetProposalInputSchema,
  ListProposalsInputSchema,
  ReviewProposalInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { proposalReadProcedure, proposalWriteProcedure, router } from '../trpc';

export const proposalRouter = router({
  list: proposalReadProcedure.input(ListProposalsInputSchema).query(async ({ ctx }) => {
    return ctx.services.proposalService.list({
      membership: ctx.membership,
      project: ctx.project,
    });
  }),
  get: proposalReadProcedure.input(GetProposalInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.proposalService.get(
      { membership: ctx.membership, project: ctx.project },
      input.proposalId,
    );
  }),
  create: proposalWriteProcedure
    .meta({ invalidates: mutationInvalidations['proposal.create'] })
    .input(CreateProposalInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('proposal.create requires a user actor');
      }
      return ctx.services.proposalService.create(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  review: proposalWriteProcedure
    .meta({ invalidates: mutationInvalidations['proposal.review'] })
    .input(ReviewProposalInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('proposal.review requires a user actor');
      }
      return ctx.services.proposalService.review(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
});
