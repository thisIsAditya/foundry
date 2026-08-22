'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  projectDecisionsHref,
  projectEvidenceHref,
  projectHref,
  projectJourneyHref,
  projectModelHref,
} from '../../lib/project-href';

const DESTINATIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'journey', label: 'Journey' },
  { id: 'model', label: 'Model' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'decisions', label: 'Decisions' },
] as const;

function destinationHref(projectId: string, id: (typeof DESTINATIONS)[number]['id']): string {
  if (id === 'overview') {
    return projectHref(projectId);
  }
  if (id === 'journey') {
    return projectJourneyHref(projectId);
  }
  if (id === 'model') {
    return projectModelHref(projectId);
  }
  if (id === 'evidence') {
    return projectEvidenceHref(projectId);
  }
  return projectDecisionsHref(projectId);
}

function currentDestination(pathname: string, projectId: string): string {
  if (pathname.startsWith(`/p/${projectId}/journey`)) {
    return 'journey';
  }
  if (pathname.startsWith(`/p/${projectId}/model`)) {
    return 'model';
  }
  if (pathname.startsWith(`/p/${projectId}/evidence`)) {
    return 'evidence';
  }
  if (pathname.startsWith(`/p/${projectId}/decisions`)) {
    return 'decisions';
  }
  return 'overview';
}

export function ProjectHeader({
  projectId,
  name,
  pendingProposalCount,
}: {
  projectId: string;
  name: string;
  pendingProposalCount: number;
}) {
  const pathname = usePathname();
  const current = currentDestination(pathname, projectId);

  return (
    <header className="project-header">
      <p className="font-display truncate text-sm font-medium">{name}</p>
      <nav className="project-header-cluster hidden md:flex" aria-label="Venture">
        {DESTINATIONS.map((item) => (
          <Link
            key={item.id}
            href={destinationHref(projectId, item.id)}
            className="project-header-btn"
            aria-current={current === item.id ? 'page' : undefined}
          >
            {item.label}
            {item.id === 'decisions' && pendingProposalCount > 0 ? (
              <span className="header-badge">
                {pendingProposalCount > 9 ? '9+' : String(pendingProposalCount)}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function ProjectMobileNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const current = currentDestination(pathname, projectId);
  const items = [
    { id: 'overview', label: 'Overview', href: projectHref(projectId) },
    { id: 'journey', label: 'Journey', href: projectJourneyHref(projectId) },
    { id: 'evidence', label: 'Capture', href: projectEvidenceHref(projectId) },
    { id: 'model', label: 'Model', href: projectModelHref(projectId) },
    { id: 'decisions', label: 'Decisions', href: projectDecisionsHref(projectId) },
  ] as const;

  return (
    <nav className="project-mobile-nav" aria-label="Primary">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="project-mobile-nav-link"
          aria-current={current === item.id ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
