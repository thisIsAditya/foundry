import {
  ConfirmUploadInputSchema,
  CreateUploadIntentInputSchema,
  ListEvidenceInputSchema,
  SearchEvidenceInputSchema,
} from '@foundry/api-contracts';

import { projectProcedure, projectReadProcedure, protectedProcedure, router } from '../trpc';

export const evidenceRouter = router({
  createUploadIntent: projectProcedure
    .meta({ invalidates: ['evidence.list'] })
    .input(CreateUploadIntentInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('projectProcedure requires a user actor');
      }
      return ctx.services.documentService.createUploadIntent(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
        ctx.correlationId,
      );
    }),
  confirmUpload: protectedProcedure
    .meta({ invalidates: ['evidence.list'] })
    .input(ConfirmUploadInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('protectedProcedure requires a user actor');
      }
      return ctx.services.documentService.confirmUpload(
        { userId: ctx.actor.userId, memberships: ctx.actor.memberships },
        input,
        ctx.correlationId,
      );
    }),
  list: projectReadProcedure.input(ListEvidenceInputSchema).query(async ({ ctx }) => {
    return ctx.services.documentService.list(ctx.membership, ctx.project, ctx.correlationId);
  }),
  search: projectReadProcedure.input(SearchEvidenceInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.documentService.search(
      ctx.membership,
      ctx.project,
      input,
      ctx.correlationId,
    );
  }),
});
