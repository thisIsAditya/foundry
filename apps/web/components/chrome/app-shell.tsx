import Link from 'next/link';
import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface-raised">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-6">
          <Link href="/home" className="text-sm font-medium no-underline hover:no-underline">
            Foundry
          </Link>
          <Link href="/home" className="nav-link">
            All workspaces
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="page">{children}</div>;
}
