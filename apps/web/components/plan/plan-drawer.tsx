'use client';

import { BusinessModelSectionView } from './section-detail';
import { PlanSectionList } from './section-list';

export function PlanDrawer({
  projectId,
  section,
}: {
  projectId: string;
  section: string | null;
}) {
  if (section !== null) {
    return <BusinessModelSectionView projectId={projectId} section={section} />;
  }
  return <PlanSectionList projectId={projectId} />;
}
