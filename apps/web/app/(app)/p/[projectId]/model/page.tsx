import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ExportRecordButton } from '../../../../../components/journey/export-record';
import { ProvenanceBadge } from '../../../../../components/journey/primitives';
import { projectModelHref } from '../../../../../lib/project-href';
import { createServerApi } from '../../../../../lib/trpc/server';

export const metadata: Metadata = { title: 'Business record' };

export default async function ModelPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  try {
    const api = await createServerApi();
    const sections = await api.record.listSections({ projectId });
    return (
      <article className="stack">
        <header>
          <h1 className="page-title">Business record</h1>
          <p className="lede">
            Twelve sections. Empty means unknown, not validated. Provenance is labelled in words,
            not by a success score.
          </p>
        </header>
        <ExportRecordButton projectId={projectId} />
        <ul className="stack">
          {sections.map((card) => (
            <li key={card.section} className="panel">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="card-title">{card.label}</h2>
                <ProvenanceBadge
                  provenance={card.item.provenance}
                  stale={card.staleReasons.length > 0}
                />
              </div>
              <p className="muted">
                {card.item.content.summary.length === 0
                  ? 'Empty on purpose. Absence is not a completed section.'
                  : card.item.content.summary}
              </p>
              <p className="hint">
                {card.item.status.replaceAll('_', ' ')} · {card.smallestAction}
              </p>
              {card.staleReasons.length === 0 ? null : (
                <ul className="hint">
                  {card.staleReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
              <Link
                className="mt-2 inline-flex min-h-11 items-center"
                href={projectModelHref(projectId, card.section)}
              >
                Open {card.label}
              </Link>
            </li>
          ))}
        </ul>
      </article>
    );
  } catch {
    notFound();
  }
}
