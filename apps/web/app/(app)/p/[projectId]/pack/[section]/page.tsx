import { PackSectionView } from './pack-section-view';

export default async function PackSectionPage({
  params,
}: {
  params: Promise<{ projectId: string; section: string }>;
}) {
  const { projectId, section } = await params;
  return <PackSectionView projectId={projectId} section={section} />;
}
