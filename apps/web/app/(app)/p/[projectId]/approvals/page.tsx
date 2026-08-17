import { ApprovalsQueue } from './approvals-queue';

export default async function ApprovalsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ApprovalsQueue projectId={projectId} />;
}
