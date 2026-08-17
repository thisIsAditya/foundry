'use client';

import { EvidenceLibraryFilters } from '@foundry/api-contracts';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';

import { InterviewCapture } from '../../../../../components/evidence/interview-capture';
import { EmptyState } from '../../../../../components/ui/empty-state';
import { useTRPC } from '../../../../../lib/trpc/client';

export default function ResearchPage() {
  const rawId = useParams().projectId;
  const projectId = typeof rawId === 'string' ? rawId : '';
  const search = useSearchParams();
  const filter = EvidenceLibraryFilters.find((item) => item === search.get('filter'));
  const trpc = useTRPC();
  const library = useQuery(
    trpc.evidence.listLibrary.queryOptions({
      projectId,
      ...(filter === undefined ? {} : { filter }),
    }),
  );
  const findings = useQuery(trpc.evidence.listFindings.queryOptions({ projectId }));
  const jobs = useQuery(trpc.job.list.queryOptions({ projectId, view: 'waiting_for_research' }));

  return (
    <div className="stack">
      <header>
        <h1 className="page-title">Research and evidence</h1>
        <p className="lede">
          Sources, interviews, findings, and conflicts. A citation must show what it supports.
        </p>
      </header>
      <nav className="flex flex-wrap gap-2" aria-label="Evidence filters">
        <a
          href={`/p/${projectId}/research`}
          className={filter === undefined ? 'badge badge-info no-underline' : 'badge no-underline'}
        >
          All
        </a>
        {EvidenceLibraryFilters.map((item) => (
          <a
            key={item}
            href={`/p/${projectId}/research?filter=${item}`}
            className={filter === item ? 'badge badge-info no-underline' : 'badge no-underline'}
          >
            {item.replaceAll('_', ' ')}
          </a>
        ))}
      </nav>
      <section className="card stack">
        <h2 className="card-title">Before starting research</h2>
        {(jobs.data ?? []).length === 0 ? (
          <p className="hint">No research job is waiting. Proposed jobs appear on the work board.</p>
        ) : (
          <ul className="stack">
            {(jobs.data ?? []).map((job) => (
              <li key={job.id} className="stack" style={{ gap: '0.35rem' }}>
                <p className="text-sm">{job.objective}</p>
                <p className="hint">{job.whyNow ?? 'Baseline market and competitor research.'}</p>
                <p className="muted">
                  {job.estimatedCost === undefined
                    ? 'Cost unknown'
                    : `${job.estimatedCost.inputEstimate} / ${job.estimatedCost.outputEstimate} ${job.estimatedCost.currency}`}
                </p>
                <a href={`/p/${projectId}/work?job=${job.id}`}>Review and start</a>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card stack">
        <h2 className="card-title">Findings</h2>
        {findings.isLoading ? <p className="muted">Loading findings…</p> : null}
        {(findings.data ?? []).length === 0 ? (
          <EmptyState
            title="No findings yet"
            description="Completed research jobs write findings here, grouped by the sections they affect."
          />
        ) : (
          <ul className="stack">
            {(findings.data ?? []).map((finding) => (
              <li key={finding.id} className="panel stack" style={{ gap: '0.35rem' }}>
                <p className="text-sm">{finding.claim}</p>
                <p className="muted">
                  {finding.affectedSectionKeys.join(', ') || 'Unassigned'} ·{' '}
                  {finding.citationIds.length} citations
                </p>
                {finding.conflictsWithFindingIds.length === 0 ? (
                  <span className="badge badge-success">Agrees with current sources</span>
                ) : (
                  <span className="badge badge-warning">Conflicts with other findings</span>
                )}
                {finding.staleAt === null ? null : <span className="badge">Stale</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card stack">
        <h2 className="card-title">Library</h2>
        {library.isLoading ? <p className="muted">Loading evidence…</p> : null}
        {library.isError ? <p className="alert">{library.error.message}</p> : null}
        {(library.data ?? []).length === 0 ? (
          <p className="hint">Nothing in this filter yet.</p>
        ) : (
          <ul className="list">
            {(library.data ?? []).map((item) => (
              <li key={`${item.kind}-${item.id}`} className="list-row">
                <div>
                  <p className="text-sm">{item.title}</p>
                  <p className="muted">{item.detail}</p>
                </div>
                <span className="badge">{item.kind.replaceAll('_', ' ')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <InterviewCapture projectId={projectId} />
    </div>
  );
}
