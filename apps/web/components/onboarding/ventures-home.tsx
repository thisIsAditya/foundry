'use client';

import type { Project } from '@foundry/domain';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { useTRPC } from '../../lib/trpc/client';
import { VentureComposer } from './venture-composer';

export function VenturesHome({
  workspaceId,
  initialProjects,
}: {
  workspaceId: string;
  initialProjects: Project[];
}) {
  const trpc = useTRPC();
  const projects = useQuery({
    ...trpc.project.list.queryOptions({ workspaceId }),
    initialData: initialProjects,
  });
  const [composing, setComposing] = useState(false);
  const items = projects.data ?? [];

  if (projects.isLoading) {
    return <p className="muted">Loading your ventures…</p>;
  }
  if (projects.isError) {
    return <p className="alert">{projects.error.message}</p>;
  }
  if (items.length === 0) {
    return <VentureComposer workspaceId={workspaceId} variant="hero" />;
  }

  return (
    <div className="page stack">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Your ventures</h1>
          <p className="lede">Open one to keep working, or start another from a short idea.</p>
        </div>
        <button type="button" className="btn min-h-11" onClick={() => setComposing(true)}>
          New venture
        </button>
      </header>
      <ul className="list">
        {items.map((project) => (
          <VentureRow key={project.id} projectId={project.id} name={project.name} />
        ))}
      </ul>
      {composing ? (
        <VentureComposer
          workspaceId={workspaceId}
          variant="overlay"
          onCancel={() => setComposing(false)}
        />
      ) : null}
    </div>
  );
}

function VentureRow({ projectId, name }: { projectId: string; name: string }) {
  const trpc = useTRPC();
  const overview = useQuery(trpc.journey.getOverview.queryOptions({ projectId }));

  return (
    <li className="list-row">
      <Link href={`/p/${projectId}`} className="flex min-w-0 items-center gap-3 no-underline">
        <span className="min-w-0">
          <span className="block truncate text-sm">{name}</span>
          <span className="hint">
            {overview.isLoading
              ? 'Loading stage…'
              : overview.isError
                ? overview.error.message
                : overview.data === undefined || overview.data === null
                  ? 'Stage pending'
                  : `${overview.data.stageLabel} · ${overview.data.journey.currentObjective}`}
          </span>
        </span>
      </Link>
    </li>
  );
}
