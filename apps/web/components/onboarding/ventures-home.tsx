'use client';

import { Gauge } from '@foundry/ui';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { journeyStep } from '../../lib/journey';
import { useTRPC } from '../../lib/trpc/client';
import { VentureComposer } from './venture-composer';

export function VenturesHome({ workspaceId }: { workspaceId: string }) {
  const trpc = useTRPC();
  const projects = useQuery(trpc.project.list.queryOptions({ workspaceId }));
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
          <p className="lede">Open one to keep working, or start another.</p>
        </div>
        <button type="button" className="btn" onClick={() => setComposing(true)}>
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
  const desk = useQuery(trpc.project.getDeskSummary.queryOptions({ projectId }));
  const score = useQuery(trpc.score.getCurrent.queryOptions({ projectId }));
  const phase = desk.data?.derivedPhase;
  const overall = score.data === undefined || score.data === null ? null : score.data.overall;

  return (
    <li className="list-row">
      <Link href={`/p/${projectId}`} className="flex min-w-0 items-center gap-3 no-underline">
        <Gauge value={overall} size="sm" label={`${name} score`} />
        <span className="min-w-0">
          <span className="block truncate text-sm">{name}</span>
          <span className="hint">
            {desk.isLoading
              ? 'Loading phase…'
              : desk.isError
                ? desk.error.message
                : phase === undefined
                  ? 'Phase pending'
                  : journeyStep(phase).title}
          </span>
        </span>
      </Link>
    </li>
  );
}
