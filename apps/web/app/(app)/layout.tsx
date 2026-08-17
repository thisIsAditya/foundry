import type { ReactNode } from 'react';

import { AppShell } from '../../components/chrome/app-shell';

export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
