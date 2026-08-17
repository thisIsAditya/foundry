import {
  AddMcpServerInputSchema,
  McpServerIdInputSchema,
  ToggleMcpServerInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { protectedProcedure, router } from '../trpc';

export const mcpServerRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.actor.type !== 'user') {
      throw new Error('protectedProcedure requires a user actor');
    }
    return ctx.services.mcpServerService.list(ctx.actor.userId);
  }),
  add: protectedProcedure
    .meta({ invalidates: mutationInvalidations['mcpServer.add'] })
    .input(AddMcpServerInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('protectedProcedure requires a user actor');
      }
      return ctx.services.mcpServerService.add(ctx.actor.userId, input);
    }),
  remove: protectedProcedure
    .meta({ invalidates: mutationInvalidations['mcpServer.remove'] })
    .input(McpServerIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('protectedProcedure requires a user actor');
      }
      return ctx.services.mcpServerService.remove(
        ctx.actor.userId,
        input.mcpServerId,
        input.idempotencyKey,
      );
    }),
  toggle: protectedProcedure
    .meta({ invalidates: mutationInvalidations['mcpServer.toggle'] })
    .input(ToggleMcpServerInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('protectedProcedure requires a user actor');
      }
      return ctx.services.mcpServerService.toggle(
        ctx.actor.userId,
        input.mcpServerId,
        input.enabled,
        input.idempotencyKey,
      );
    }),
  testConnection: protectedProcedure
    .meta({ invalidates: mutationInvalidations['mcpServer.testConnection'] })
    .input(McpServerIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('protectedProcedure requires a user actor');
      }
      return ctx.services.mcpServerService.testConnection(ctx.actor.userId, input.mcpServerId);
    }),
});
