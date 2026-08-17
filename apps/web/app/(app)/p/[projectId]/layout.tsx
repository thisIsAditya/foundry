import type { ReactNode } from 'react';

import { Page } from '../../../../components/chrome/app-shell';
import { ProjectNav } from '../../../../components/chrome/project-nav';

export default function ProjectLayout({ children }: { children: ReactNode }) {
  return (
    <Page>
      <ProjectNav />
      {children}
    </Page>
  );
}
