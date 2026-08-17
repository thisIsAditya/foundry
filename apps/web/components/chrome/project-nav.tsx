'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

const links = [
  {
    href: (id: string) => `/p/${id}`,
    label: 'Overview',
    title: 'Score, next action, and current work',
    match: (path: string, id: string) => path === `/p/${id}`,
  },
  {
    href: (id: string) => `/p/${id}/co-founder`,
    label: 'Co-founder',
    title: 'Durable conversation with your AI co-founder',
    match: (path: string, id: string) => path.startsWith(`/p/${id}/co-founder`),
  },
  {
    href: (id: string) => `/p/${id}/plan`,
    label: 'Business model',
    title: 'All 17 plan sections',
    match: (path: string, id: string) =>
      path.startsWith(`/p/${id}/plan`) || path.startsWith(`/p/${id}/pack`),
  },
  {
    href: (id: string) => `/p/${id}/work`,
    label: 'Work board',
    title: 'AI jobs, founder tasks, and approvals',
    match: (path: string, id: string) =>
      path.startsWith(`/p/${id}/work`) || path.startsWith(`/p/${id}/approvals`),
  },
  {
    href: (id: string) => `/p/${id}/research`,
    label: 'Research & evidence',
    title: 'Sources, interviews, findings, and conflicts',
    match: (path: string, id: string) => path.startsWith(`/p/${id}/research`),
  },
  {
    href: (id: string) => `/p/${id}/decisions`,
    label: 'Decisions',
    title: 'GO, PIVOT, KILL, and recorded choices',
    match: (path: string, id: string) => path.startsWith(`/p/${id}/decisions`),
  },
  {
    href: (id: string) => `/p/${id}/settings`,
    label: 'Settings',
    title: 'Providers, members, and preferences',
    match: (path: string, id: string) => path.startsWith(`/p/${id}/settings`),
  },
] as const;

export function ProjectNav() {
  const pathname = usePathname();
  const rawId = useParams().projectId;
  const projectId = typeof rawId === 'string' ? rawId : undefined;
  if (projectId === undefined) {
    return null;
  }

  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-border" aria-label="Project">
      {links.map((link) => {
        const href = link.href(projectId);
        const current = link.match(pathname, projectId);
        return (
          <Link
            key={link.label}
            href={href}
            title={link.title}
            className={
              current
                ? 'border-b-2 border-text px-1 pb-3 text-sm font-medium text-text no-underline'
                : 'border-b-2 border-transparent px-1 pb-3 text-sm text-text-muted no-underline hover:text-text'
            }
            aria-current={current ? 'page' : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
