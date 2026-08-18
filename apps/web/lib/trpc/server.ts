import { listWorkspaceMembershipsByUserId } from '@foundry/db';
import { headers } from 'next/headers';

import { createContext } from '../../server/context';
import { appRouter } from '../../server/routers/_app';

export async function createServerApi() {
  const incoming = await headers();
  const request = new Request('http://localhost/api/trpc', { headers: incoming });
  const ctx = await createContext(request);
  if (ctx.actor.type !== 'user') {
    return appRouter.createCaller(ctx);
  }
  await ctx.services.workspaceService.ensureDefaultWorkspace(ctx.actor.userId);
  const memberships = await listWorkspaceMembershipsByUserId(ctx.sql, ctx.actor.userId);
  return appRouter.createCaller({
    ...ctx,
    actor: { ...ctx.actor, memberships },
  });
}
