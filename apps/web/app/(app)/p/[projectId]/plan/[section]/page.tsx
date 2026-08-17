import { BusinessModelSectionView } from './section-detail';

export default async function PlanSectionPage({
  params,
}: {
  params: Promise<{ projectId: string; section: string }>;
}) {
  const { projectId, section } = await params;
  return <BusinessModelSectionView projectId={projectId} section={section} />;
}
