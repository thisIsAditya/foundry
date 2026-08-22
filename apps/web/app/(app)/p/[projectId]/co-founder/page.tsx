import { IntakeReview } from '../../../../../components/cofounder/intake-review';

export default async function CofounderPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <IntakeReview projectId={projectId} />;
}
