import Link from 'next/link';
import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <Link href="/home" className="text-sm font-medium no-underline hover:no-underline">
            Foundry
          </Link>
          <Link href="/home" className="nav-link min-h-11 inline-flex items-center">
            Ventures
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
