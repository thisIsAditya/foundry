'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

import { useTRPC } from '../../lib/trpc/client';
import { CofounderRail } from './cofounder-rail';
import { ProjectHeader, ProjectMobileNav } from './project-nav';

export function ProjectShell({ projectId, children }: { projectId: string; children: ReactNode }) {
  const trpc = useTRPC();
  const pathname = usePathname();
  const overview = useQuery(trpc.journey.getOverview.queryOptions({ projectId }));
  const pending = overview.data?.pendingProposals.length ?? 0;
  const isCofounderPage = pathname.endsWith('/co-founder');

  return (
    <div className="project-shell">
      <ProjectHeader
        projectId={projectId}
        name={overview.data?.journey.currentObjective ?? 'Venture'}
        pendingProposalCount={pending}
      />
      <div className="project-body">
        {isCofounderPage ? null : <CofounderRail projectId={projectId} />}
        <main id="main-content" className="project-focus" tabIndex={-1}>
          {children}
        </main>
      </div>
      <ProjectMobileNav projectId={projectId} />
    </div>
  );
}
