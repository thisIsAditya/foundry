'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { ModelProviderPanel } from '../model-provider-panel';
import { useTRPC } from '../../../../../lib/trpc/client';

export default function ProjectSettingsPage() {
  const rawId = useParams().projectId;
  const projectId = typeof rawId === 'string' ? rawId : '';
  const trpc = useTRPC();
  const desk = useQuery(trpc.project.getDeskSummary.queryOptions({ projectId }));
  const preferences = useQuery(trpc.conversation.listPreferences.queryOptions({ projectId }));
  const workspaceId = desk.data?.project.workspaceId;
  const members = useQuery({
    ...trpc.member.list.queryOptions({
      workspaceId: workspaceId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: workspaceId !== undefined,
  });
  const integrations = useQuery({
    ...trpc.integration.list.queryOptions({
      workspaceId: workspaceId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: workspaceId !== undefined,
  });

  return (
    <div className="stack">
      <header>
        <h1 className="page-title">Settings</h1>
        <p className="lede">
          Providers, members, preferences, and draft-only integrations. Nothing here can send,
          charge, or file.
        </p>
      </header>
      {workspaceId === undefined ? (
        <p className="muted">Loading workspace…</p>
      ) : (
        <ModelProviderPanel workspaceId={workspaceId} />
      )}
      <section className="card stack">
        <h2 className="card-title">Members</h2>
        {(members.data ?? []).length === 0 ? (
          <p className="hint">No members listed.</p>
        ) : (
          <ul className="list">
            {(members.data ?? []).map((member) => (
              <li key={member.userId} className="list-row">
                <span className="text-sm">{member.userId}</span>
                <span className="badge">{member.role}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card stack">
        <h2 className="card-title">Project preferences</h2>
        {(preferences.data ?? []).length === 0 ? (
          <p className="hint">The co-founder has not inferred any preferences yet.</p>
        ) : (
          <ul className="list">
            {(preferences.data ?? []).map((item) => (
              <li key={item.id} className="list-row">
                <span className="text-sm">
                  {item.key}: {String(item.value)}
                </span>
                <span className="badge">{item.founderConfirmed ? 'Confirmed' : 'Unconfirmed'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card stack">
        <h2 className="card-title">Draft-only integrations</h2>
        <p className="hint">
          Connected integrations stay draft-only in this version. Writes require a separate
          approval-gated path.
        </p>
        {(integrations.data ?? []).length === 0 ? (
          <p className="muted">None connected.</p>
        ) : (
          <ul className="list">
            {(integrations.data ?? []).map((item) => (
              <li key={item.id} className="list-row">
                <span className="text-sm">{item.provider}</span>
                <span className="badge">
                  {item.connected ? 'Connected (draft-only)' : 'Revoked'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
