'use client';

import { useParams } from 'next/navigation';

import { ModelProviderPanel } from '../../../p/[projectId]/model-provider-panel';

export default function WorkspaceSettingsPage() {
  const rawId = useParams().workspaceId;
  const workspaceId = typeof rawId === 'string' ? rawId : '';
  return (
    <div className="page stack">
      <header>
        <h1 className="page-title">Workspace settings</h1>
        <p className="lede">Providers and privacy for every project in this workspace.</p>
      </header>
      {workspaceId.length === 0 ? null : <ModelProviderPanel workspaceId={workspaceId} />}
    </div>
  );
}
