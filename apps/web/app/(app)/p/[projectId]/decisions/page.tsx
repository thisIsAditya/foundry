import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DecisionsList } from '../../../../../components/decisions/decisions-list';
import { ProposalReview } from '../../../../../components/journey/proposal-review';
import { createServerApi } from '../../../../../lib/trpc/server';

export const metadata: Metadata = { title: 'Decisions' };

export default async function DecisionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ proposal?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  try {
    const api = await createServerApi();
    const proposals = await api.proposal.list({ projectId });
    const selectedId =
      query.proposal ?? proposals.find((item) => item.status === 'awaiting_founder')?.id;
    const detail =
      selectedId === undefined
        ? null
        : await api.proposal.get({ projectId, proposalId: selectedId });
    return (
      <article className="stack">
        <header>
          <h1 className="page-title">Decisions</h1>
          <p className="lede">
            Review proposals as before/after content. Accepting writes a new record version. Keeping
            current leaves the accepted record unchanged.
          </p>
        </header>
        {detail === null ? (
          <p className="hint">No proposal is waiting. Accepted decisions stay listed below.</p>
        ) : (
          <ProposalReview projectId={projectId} detail={detail} />
        )}
        {proposals.filter((item) => item.id !== detail?.proposal.id).length === 0 ? null : (
          <section>
            <h2 className="card-title">Other proposals</h2>
            <ul className="stack-tight">
              {proposals
                .filter((item) => item.id !== detail?.proposal.id)
                .map((item) => (
                  <li key={item.id} className="muted">
                    {item.status.replaceAll('_', ' ')} · {item.rationale}
                  </li>
                ))}
            </ul>
          </section>
        )}
        <DecisionsList projectId={projectId} embedded />
      </article>
    );
  } catch {
    notFound();
  }
}
