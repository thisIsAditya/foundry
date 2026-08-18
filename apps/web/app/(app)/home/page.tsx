'use client';

import { useQuery } from '@tanstack/react-query';

import { VenturesHome } from '../../../components/onboarding/ventures-home';
import { useTRPC } from '../../../lib/trpc/client';

export default function HomePage() {
  const trpc = useTRPC();
  const workspaces = useQuery(trpc.workspace.list.queryOptions());
  const workspaceId = workspaces.data?.[0]?.id;

  if (workspaces.isLoading) {
    return <p className="muted px-6 py-10">Loading your workspace…</p>;
  }
  if (workspaces.isError) {
    return <p className="alert px-6 py-10">{workspaces.error.message}</p>;
  }
  if (workspaceId === undefined) {
    return (
      <p className="alert px-6 py-10">
        No workspace is ready yet. Refresh the page — one is created automatically.
      </p>
    );
  }
  return <VenturesHome workspaceId={workspaceId} />;
}
