import { headers } from 'next/headers';
import type { ReactNode } from 'react';

import { AppShell } from '../../components/chrome/app-shell';
import { createContext } from '../../server/context';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const incoming = await headers();
  const request = new Request('http://localhost/app', { headers: incoming });
  const ctx = await createContext(request);
  if (ctx.actor.type === 'user') {
    await ctx.services.workspaceService.ensureDefaultWorkspace(ctx.actor.userId);
  }
  return <AppShell>{children}</AppShell>;
}
