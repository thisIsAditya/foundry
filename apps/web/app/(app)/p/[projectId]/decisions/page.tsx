import { DecisionsList } from './decisions-list';

export default async function DecisionsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <DecisionsList projectId={projectId} />;
}
