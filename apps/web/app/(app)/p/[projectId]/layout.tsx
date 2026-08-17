import type { ReactNode } from 'react';

import {
  CofounderCollapsedLink,
  CofounderPanel,
} from '../../../../components/chrome/cofounder-panel';
import { ProjectNav } from '../../../../components/chrome/project-nav';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <div className="project-frame">
      <div className="project-main">
        <ProjectNav />
        {children}
        <CofounderCollapsedLink projectId={projectId} />
      </div>
      <CofounderPanel />
    </div>
  );
}
