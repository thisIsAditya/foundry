import {
  ConfirmPreferenceInputSchema,
  CorrectPreferenceInputSchema,
  GetConversationSummaryInputSchema,
  ListConversationInputSchema,
  ListPreferencesInputSchema,
  SendConversationInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { projectAnswerProcedure, projectReadProcedure, router } from '../trpc';

export const conversationRouter = router({
  list: projectReadProcedure.input(ListConversationInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.conversationService.list(
      { membership: ctx.membership, project: ctx.project },
      { ...(input.cursor === undefined ? {} : { cursor: input.cursor }), limit: input.limit },
    );
  }),
  send: projectAnswerProcedure
    .meta({ invalidates: mutationInvalidations['conversation.send'] })
    .input(SendConversationInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('conversation.send requires a user actor');
      }
      return ctx.services.conversationService.send(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
        ctx.correlationId,
      );
    }),
  getSummary: projectReadProcedure
    .input(GetConversationSummaryInputSchema)
    .query(async ({ ctx }) => {
      return ctx.services.conversationService.getSummary({
        membership: ctx.membership,
        project: ctx.project,
      });
    }),
  listPreferences: projectReadProcedure.input(ListPreferencesInputSchema).query(async ({ ctx }) => {
    return ctx.services.conversationService.listPreferences({
      membership: ctx.membership,
      project: ctx.project,
    });
  }),
  confirmPreference: projectAnswerProcedure
    .meta({ invalidates: mutationInvalidations['conversation.confirmPreference'] })
    .input(ConfirmPreferenceInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('conversation.confirmPreference requires a user actor');
      }
      return ctx.services.conversationService.confirmPreference(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input.preferenceId,
        input.idempotencyKey,
      );
    }),
  correctPreference: projectAnswerProcedure
    .meta({ invalidates: mutationInvalidations['conversation.correctPreference'] })
    .input(CorrectPreferenceInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('conversation.correctPreference requires a user actor');
      }
      return ctx.services.conversationService.correctPreference(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input.preferenceId,
        input.value,
        input.idempotencyKey,
      );
    }),
});
