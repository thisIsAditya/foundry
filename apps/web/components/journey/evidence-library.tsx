'use client';

import { EvidenceLibraryFilters } from '@foundry/api-contracts';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { projectEvidenceHref } from '../../lib/project-href';
import { useTRPC } from '../../lib/trpc/client';
import { EmptyState } from '../ui/empty-state';
import { CaptureForm } from './capture-form';

export function EvidenceLibrary({ projectId, filter }: { projectId: string; filter?: string }) {
  const selected = EvidenceLibraryFilters.find((item) => item === filter);
  const trpc = useTRPC();
  const library = useQuery(
    trpc.evidence.listLibrary.queryOptions({
      projectId,
      ...(selected === undefined ? {} : { filter: selected }),
    }),
  );
  const interviews = useQuery(trpc.evidence.listInterviews.queryOptions({ projectId }));

  return (
    <div className="stack">
      <CaptureForm projectId={projectId} />
      <nav className="flex flex-wrap gap-2" aria-label="Evidence filters">
        <Link
          href={projectEvidenceHref(projectId)}
          className={
            selected === undefined ? 'badge badge-info no-underline' : 'badge no-underline'
          }
        >
          All
        </Link>
        {EvidenceLibraryFilters.map((item) => (
          <Link
            key={item}
            href={`${projectEvidenceHref(projectId)}?filter=${item}`}
            className={selected === item ? 'badge badge-info no-underline' : 'badge no-underline'}
          >
            {item.replaceAll('_', ' ')}
          </Link>
        ))}
      </nav>
      <p className="hint">
        A note is founder input until it is linked to a claim and reviewed. An interview quota never
        blocks documentation.
      </p>
      {library.isLoading ? <p className="muted">Loading evidence…</p> : null}
      {library.isError ? <p className="alert">{library.error.message}</p> : null}
      {library.isSuccess && library.data.length === 0 ? (
        <EmptyState
          title="No evidence captured yet"
          description="Save an observation or interview. It will not be treated as proof until you accept a linked claim."
        />
      ) : null}
      {library.data === undefined || library.data.length === 0 ? null : (
        <ul className="list">
          {library.data.map((item) => (
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
      {(interviews.data ?? []).length === 0 ? null : (
        <p className="hint">{String((interviews.data ?? []).length)} interview(s) recorded.</p>
      )}
    </div>
  );
}
