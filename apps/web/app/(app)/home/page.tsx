import { VenturesHome } from '../../../components/onboarding/ventures-home';
import { createServerApi } from '../../../lib/trpc/server';

export default async function HomePage() {
  try {
    const api = await createServerApi();
    const workspaces = await api.workspace.list();
    const workspaceId = workspaces[0]?.id;
    if (workspaceId === undefined) {
      return (
        <p className="alert px-6 py-10">
          No workspace is ready yet. Refresh the page — one is created automatically.
        </p>
      );
    }
    const projects = await api.project.list({ workspaceId });
    return <VenturesHome workspaceId={workspaceId} initialProjects={projects} />;
  } catch (error) {
    return (
      <p className="alert px-6 py-10">
        {error instanceof Error ? error.message : 'Could not load your workspace.'}
      </p>
    );
  }
}
