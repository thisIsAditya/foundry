import { Suspense, type ReactNode } from 'react';
import type { Metadata } from 'next';

import { ProjectShell } from '../../../../components/chrome/project-shell';

export async function generateMetadata(): Promise<Metadata> {
  return { title: { default: 'Venture', template: '%s · Foundry' } };
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <Suspense fallback={<p className="muted px-6 py-8">Loading the venture…</p>}>
      <ProjectShell projectId={projectId}>{children}</ProjectShell>
    </Suspense>
  );
}
