import { RecordSectionKeySchema } from '@foundry/domain';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RecordSectionEditor } from '../../../../../../components/journey/record-section-editor';
import { ProposalReview } from '../../../../../../components/journey/proposal-review';
import { ProvenanceBadge } from '../../../../../../components/journey/primitives';
import { createServerApi } from '../../../../../../lib/trpc/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string; section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  return { title: section.replaceAll('_', ' ') };
}

export default async function RecordSectionPage({
  params,
}: {
  params: Promise<{ projectId: string; section: string }>;
}) {
  const { projectId, section } = await params;
  const parsed = RecordSectionKeySchema.safeParse(section);
  if (!parsed.success) {
    notFound();
  }
  try {
    const api = await createServerApi();
    const detail = await api.record.getSection({ projectId, section: parsed.data });
    const proposals = await api.proposal.list({ projectId });
    const pending = proposals.find(
      (item) => item.status === 'awaiting_founder' || item.status === 'draft',
    );
    const pendingDetail =
      pending === undefined ? null : await api.proposal.get({ projectId, proposalId: pending.id });
    const sectionProposal =
      pendingDetail !== null && pendingDetail.affectedSections.includes(parsed.data)
        ? pendingDetail
        : null;
    return (
      <article className="stack">
        <header>
          <h1 className="page-title">{detail.label}</h1>
          <p className="lede">{detail.smallestAction}</p>
        </header>
        <section className="panel stack-tight">
          <ProvenanceBadge provenance={detail.provenance} stale={detail.staleReasons.length > 0} />
          <p className="hint">
            Status: {detail.item.status.replaceAll('_', ' ')}
            {detail.versionNumber === null
              ? ''
              : ` · Record version ${String(detail.versionNumber)}`}
          </p>
          <p className="text-sm">
            {detail.item.content.summary.length === 0
              ? 'This section is empty. That is an honest gap, not a generated claim.'
              : detail.item.content.summary}
          </p>
          {detail.staleReasons.length === 0 ? null : (
            <div>
              <h2 className="card-title">Stale because</h2>
              <ul className="hint">
                {detail.staleReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <RecordSectionEditor projectId={projectId} detail={detail} />
        {sectionProposal === null ? null : (
          <ProposalReview projectId={projectId} detail={sectionProposal} />
        )}
      </article>
    );
  } catch {
    notFound();
  }
}
