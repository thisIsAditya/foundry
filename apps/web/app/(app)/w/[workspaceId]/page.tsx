import { WorkspaceProjects } from './workspace-projects';

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <WorkspaceProjects workspaceId={workspaceId} />;
}
