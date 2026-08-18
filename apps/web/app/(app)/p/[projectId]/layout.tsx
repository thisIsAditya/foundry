import type { ReactNode } from 'react';
import { Suspense } from 'react';

import { ProjectShell } from '../../../../components/chrome/project-shell';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <>
      <Suspense fallback={<p className="muted px-6 py-8">Loading the venture…</p>}>
        <ProjectShell projectId={projectId} />
      </Suspense>
      {children}
    </>
  );
}
