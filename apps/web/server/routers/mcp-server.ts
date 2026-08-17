import {
  AddMcpServerInputSchema,
  McpServerIdInputSchema,
  ToggleMcpServerInputSchema,
} from '@foundry/api-contracts';

import { protectedProcedure, router } from '../trpc';

export const mcpServerRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.actor.type !== 'user') {
      throw new Error('protectedProcedure requires a user actor');
    }
    return ctx.services.mcpServerService.list(ctx.actor.userId);
  }),
  add: protectedProcedure
    .meta({ invalidates: ['mcpServer.list'] })
    .input(AddMcpServerInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('protectedProcedure requires a user actor');
      }
      return ctx.services.mcpServerService.add(ctx.actor.userId, input);
    }),
  remove: protectedProcedure
    .meta({ invalidates: ['mcpServer.list'] })
    .input(McpServerIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('protectedProcedure requires a user actor');
      }
      return ctx.services.mcpServerService.remove(ctx.actor.userId, input.mcpServerId);
    }),
  toggle: protectedProcedure
    .meta({ invalidates: ['mcpServer.list'] })
    .input(ToggleMcpServerInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('protectedProcedure requires a user actor');
      }
      return ctx.services.mcpServerService.toggle(
        ctx.actor.userId,
        input.mcpServerId,
        input.enabled,
      );
    }),
  testConnection: protectedProcedure
    .meta({ invalidates: ['mcpServer.list'] })
    .input(McpServerIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('protectedProcedure requires a user actor');
      }
      return ctx.services.mcpServerService.testConnection(ctx.actor.userId, input.mcpServerId);
    }),
});
