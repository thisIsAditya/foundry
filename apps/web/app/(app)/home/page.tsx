import { VenturesHome } from '../../../components/onboarding/ventures-home';
import { createServerApi } from '../../../lib/trpc/server';

export default async function HomePage() {
  try {
    const api = await createServerApi();
    const workspaces = await api.workspace.list();
    const workspaceId = workspaces[0]?.id;
    if (workspaceId === undefined) {
      return (
        <main id="main-content" className="alert px-6 py-10" tabIndex={-1}>
          No workspace is ready yet. Refresh the page — one is created automatically.
        </main>
      );
    }
    const projects = await api.project.list({ workspaceId });
    return (
      <main id="main-content" tabIndex={-1}>
        <VenturesHome workspaceId={workspaceId} initialProjects={projects} />
      </main>
    );
  } catch (error) {
    return (
      <main id="main-content" className="alert px-6 py-10" tabIndex={-1}>
        {error instanceof Error ? error.message : 'Could not load your workspace.'}
      </main>
    );
  }
}
