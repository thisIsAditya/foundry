'use client';

import { ScoreDimensions } from '@foundry/domain';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { ScoreDimensionChip } from '../../../../components/score/score-dimension-chip';
import { SectionStatusBadge } from '../../../../components/plan/section-status-badge';
import { EmptyState } from '../../../../components/ui/empty-state';
import { useTRPC } from '../../../../lib/trpc/client';

export function ProjectOverview({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const desk = useQuery(trpc.project.getDeskSummary.queryOptions({ projectId }));
  const score = useQuery(trpc.score.getCurrent.queryOptions({ projectId }));
  const sections = useQuery(trpc.pack.listBusinessModelSections.queryOptions({ projectId }));
  const jobs = useQuery(trpc.job.list.queryOptions({ projectId, view: 'kanban' }));
  const tasks = useQuery(trpc.founderTask.list.queryOptions({ projectId, status: 'active' }));
  const revisions = useQuery(trpc.pack.listRevisions.queryOptions({ projectId }));
  const connections = useQuery({
    ...trpc.provider.listConnections.queryOptions({
      workspaceId: desk.data?.project.workspaceId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: desk.data !== undefined,
  });

  if (desk.isLoading) {
    return <p className="muted">Loading the overview…</p>;
  }
  if (desk.isError) {
    return <p className="alert">{desk.error.message} You can retry by refreshing this page.</p>;
  }
  if (desk.data === undefined) {
    return (
      <EmptyState
        title="Project not ready"
        description="Create the project again if this keeps happening."
      />
    );
  }

  const overview = desk.data.overview;
  const known = (sections.data ?? []).filter((item) => item.knownFacts.length > 0).length;
  const assumed = (sections.data ?? []).filter((item) => item.assumptions.length > 0).length;
  const missing = (sections.data ?? []).filter(
    (item) => item.knownFacts.length === 0 && item.assumptions.length === 0,
  ).length;
  const draftRevision = (revisions.data ?? []).find((item) => item.status === 'draft');
  const running = (jobs.data ?? []).filter(
    (job) => job.status === 'running' || job.status === 'queued',
  );
  const research = (jobs.data ?? []).find(
    (job) => job.jobKind === 'research' && job.status === 'proposed',
  );
  const nextAction = score.data?.topActions[0]?.action ?? desk.data.nextAction;
  const finding = score.data?.reasons[0]?.message ?? overview.topAssumptions[0];
  const healthy = (connections.data ?? []).find((item) => item.healthStatus === 'ok');
  const estimated = running.reduce((sum, job) => {
    const value = Number(job.estimatedCost?.inputEstimate ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  return (
    <div className="stack">
      <header className="stack" style={{ gap: '0.5rem' }}>
        <h1 className="page-title">{desk.data.project.name}</h1>
        <p className="lede">
          {overview.latestCofounderMessage?.text ??
            'A complete low-confidence draft is more useful than a blank plan. Assumptions are labeled as assumptions.'}
        </p>
      </header>

      <section className="card stack" aria-label="Score">
        <div>
          <p className="hint">Overall score</p>
          <p className="page-title">
            {overview.overallScore === null
              ? 'Pending'
              : `${String(Math.round(overview.overallScore))} / 100`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ScoreDimensions.map((dimension) => {
            const item = overview.dimensions?.[dimension];
            if (item === undefined) {
              return (
                <ScoreDimensionChip
                  key={dimension}
                  dimension={dimension}
                  raw={0}
                  basis="insufficient_data"
                />
              );
            }
            return (
              <ScoreDimensionChip
                key={dimension}
                dimension={dimension}
                raw={item.raw}
                basis={item.basis}
              />
            );
          })}
        </div>
        <p className="muted">
          Known {known} · Assumed {assumed} · Missing {missing}
        </p>
      </section>

      <section className="callout">
        <p className="callout-eyebrow">Recommended next action</p>
        <p className="callout-title">{nextAction}</p>
        {finding === undefined ? null : <p className="text-sm">{finding}</p>}
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="card stack">
          <h2 className="card-title">AI work running</h2>
          {running.length === 0 ? (
            <p className="hint">Nothing running right now.</p>
          ) : (
            <ul className="stack" style={{ gap: '0.5rem' }}>
              {running.map((job) => (
                <li key={job.id}>
                  <Link href={`/p/${projectId}/work?job=${job.id}`}>{job.objective}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card stack">
          <h2 className="card-title">Waiting on you</h2>
          <p className="muted">
            {overview.waitingFounderTasks} founder task
            {overview.waitingFounderTasks === 1 ? '' : 's'}.
          </p>
          {(tasks.data ?? []).slice(0, 2).map((task) => (
            <Link key={task.id} href={`/p/${projectId}/work?task=${task.id}`}>
              {task.title}
            </Link>
          ))}
        </section>
        <section className="card stack">
          <h2 className="card-title">Revision waiting for review</h2>
          {draftRevision === undefined && !overview.revisionPendingReview ? (
            <p className="hint">No draft revision pending.</p>
          ) : (
            <Link href={`/p/${projectId}/plan`}>Review the draft plan</Link>
          )}
        </section>
        <section className="card stack">
          <h2 className="card-title">Research waiting to start</h2>
          {research === undefined ? (
            <p className="hint">No research proposal waiting.</p>
          ) : (
            <Link href={`/p/${projectId}/work?job=${research.id}`}>{research.objective}</Link>
          )}
        </section>
      </div>

      <section className="card stack">
        <h2 className="card-title">Provider and cost</h2>
        <p className="text-sm">
          {healthy === undefined
            ? 'No healthy model connection. Open Settings to connect one.'
            : `${healthy.providerFamily} · ${healthy.authMode}`}
        </p>
        <p className="muted">Estimated input tokens for running jobs: {String(estimated)}.</p>
        <Link href={`/p/${projectId}/settings`}>Open settings</Link>
      </section>

      <section className="card stack" aria-label="Business model status">
        <div className="flex items-center justify-between">
          <h2 className="card-title">Business model</h2>
          <Link href={`/p/${projectId}/plan`}>Open all 17 sections</Link>
        </div>
        <ul className="stack" style={{ gap: '0.5rem' }}>
          {(sections.data ?? []).map((section) => (
            <li key={section.key} className="flex flex-wrap items-center gap-2">
              <SectionStatusBadge status={section.status} />
              <Link href={`/p/${projectId}/plan/${section.key}`}>{section.title}</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
