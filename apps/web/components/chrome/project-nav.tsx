'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

const links = [
  {
    href: (id: string) => `/p/${id}`,
    label: 'Desk',
    title: 'Work through your idea step by step',
    match: (path: string, id: string) => path === `/p/${id}`,
  },
  {
    href: (id: string) => `/p/${id}/pack/mvbp`,
    label: 'Pack',
    title: 'Your business plan',
    match: (path: string, id: string) => path.startsWith(`/p/${id}/pack`),
  },
  {
    href: (id: string) => `/p/${id}/approvals`,
    label: 'Approvals',
    title: 'Real-world actions waiting on you',
    match: (path: string, id: string) => path.startsWith(`/p/${id}/approvals`),
  },
  {
    href: (id: string) => `/p/${id}/decisions`,
    label: 'Decisions',
    title: 'A log of choices made along the way',
    match: (path: string, id: string) => path.startsWith(`/p/${id}/decisions`),
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
    <nav className="mb-8 flex gap-1 border-b border-border" aria-label="Project">
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
