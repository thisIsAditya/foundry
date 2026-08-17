'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { SectionStatusBadge } from '../../../../../components/plan/section-status-badge';
import { Scorecard } from '../../../../../components/score/scorecard';
import { EmptyState } from '../../../../../components/ui/empty-state';
import { useTRPC } from '../../../../../lib/trpc/client';

export default function PlanIndexPage() {
  const rawId = useParams().projectId;
  const projectId = typeof rawId === 'string' ? rawId : '';
  const trpc = useTRPC();
  const sections = useQuery(trpc.pack.listBusinessModelSections.queryOptions({ projectId }));

  return (
    <div className="stack">
      <header>
        <h1 className="page-title">Business model</h1>
        <p className="lede">
          A complete low-confidence section is more useful than an empty one. Assumptions are never
          shown as facts.
        </p>
      </header>
      <section className="card">
        <Scorecard projectId={projectId} />
      </section>
      {sections.isLoading ? <p className="muted">Loading sections…</p> : null}
      {sections.isError ? <p className="alert">{sections.error.message}</p> : null}
      {sections.isSuccess && sections.data.length === 0 ? (
        <EmptyState title="No sections yet" description="Create the project again if this persists." />
      ) : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(sections.data ?? []).map((section) => (
          <Link
            key={section.key}
            href={`/p/${projectId}/plan/${section.key}`}
            className="card stack no-underline hover:no-underline"
          >
            <div className="flex flex-wrap items-center gap-2">
              <SectionStatusBadge status={section.status} />
              {section.scoreContribution === null ? null : (
                <span className="badge">{section.scoreContribution.toFixed(1)}</span>
              )}
            </div>
            <p className="card-title">{section.title}</p>
            <p className="hint">{section.summary || 'Intentionally incomplete — labeled assumptions.'}</p>
            <p className="muted">
              {section.knownFacts.length} known · {section.assumptions.length} assumed ·{' '}
              {section.citations.length} citations
            </p>
            <p className="text-sm">{section.nextAction}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
