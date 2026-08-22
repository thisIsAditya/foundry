import { ListConversationInputSchema } from '@foundry/api-contracts';

import { projectReadProcedure, router } from '../trpc';

export const conversationRouter = router({
  list: projectReadProcedure
    .input(ListConversationInputSchema)
    .query(async ({ ctx, input }) =>
      ctx.services.conversationService.list(
        { membership: ctx.membership, project: ctx.project },
        { ...(input.cursor === undefined ? {} : { cursor: input.cursor }), limit: input.limit },
      ),
    ),
});
