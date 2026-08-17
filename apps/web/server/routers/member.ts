import {
  InviteMemberInputSchema,
  ListMembersInputSchema,
  UpdateMemberRoleInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { memberReadProcedure, memberWriteProcedure, router } from '../trpc';

export const memberRouter = router({
  list: memberReadProcedure.input(ListMembersInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.memberService.list(ctx.membership, input.workspaceId);
  }),
  invite: memberWriteProcedure
    .meta({ invalidates: mutationInvalidations['member.invite'] })
    .input(InviteMemberInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('member.invite requires a user actor');
      }
      return ctx.services.memberService.invite(
        { userId: ctx.actor.userId, membership: ctx.membership },
        input,
      );
    }),
  updateRole: memberWriteProcedure
    .meta({ invalidates: mutationInvalidations['member.updateRole'] })
    .input(UpdateMemberRoleInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('member.updateRole requires a user actor');
      }
      return ctx.services.memberService.updateRole(
        { userId: ctx.actor.userId, membership: ctx.membership },
        input,
      );
    }),
});
