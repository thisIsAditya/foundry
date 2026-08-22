'use client';

import type { ProposalDetail } from '@foundry/api-contracts';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import { projectHref } from '../../lib/project-href';
import { useTRPC } from '../../lib/trpc/client';

export function ProposalReview({
  projectId,
  detail,
}: {
  projectId: string;
  detail: ProposalDetail;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [outcomes, setOutcomes] = useState<Record<string, 'accept' | 'modify' | 'keep_current'>>(
    Object.fromEntries(detail.changes.map((change) => [change.id, 'keep_current'])),
  );
  const [modified, setModified] = useState<Record<string, string>>({});
  const review = useMutation(trpc.proposal.review.mutationOptions());
  const selected = useMemo(
    () =>
      detail.changes.map((change) => {
        const outcome = outcomes[change.id] ?? 'keep_current';
        return {
          changeId: change.id,
          outcome,
          ...(outcome === 'modify' && modified[change.id] !== undefined
            ? { modifiedAfter: { summary: modified[change.id], fields: {} } }
            : {}),
        };
      }),
    [detail.changes, modified, outcomes],
  );

  return (
    <article className="panel stack">
      <h2 className="card-title">Review proposed change</h2>
      <p className="muted">{detail.proposal.rationale}</p>
      {detail.proposal.uncertainty === null ? null : (
        <p className="hint">Uncertainty: {detail.proposal.uncertainty}</p>
      )}
      <p className="hint">
        Affected: {detail.affectedSections.join(', ')}. Accepting is versioned; keeping current
        leaves the accepted record unchanged.
      </p>
      <ul className="stack">
        {detail.changes.map((change) => (
          <li key={change.id} className="panel">
            <p className="text-sm font-medium">{change.section.replaceAll('_', ' ')}</p>
            <p className="hint">Current: {JSON.stringify(change.beforePayload)}</p>
            <p className="text-sm">Proposed: {JSON.stringify(change.afterPayload)}</p>
            <fieldset className="mt-2">
              <legend className="hint">Your decision</legend>
              {(['accept', 'modify', 'keep_current'] as const).map((outcome) => (
                <label key={outcome} className="mr-3 inline-flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    name={`change-${change.id}`}
                    checked={outcomes[change.id] === outcome}
                    onChange={() =>
                      setOutcomes((current) => ({ ...current, [change.id]: outcome }))
                    }
                  />
                  {outcome === 'keep_current'
                    ? 'Keep current'
                    : outcome === 'accept'
                      ? 'Accept'
                      : 'Modify'}
                </label>
              ))}
            </fieldset>
            {outcomes[change.id] === 'modify' ? (
              <label className="field mt-2">
                <span>Modified value</span>
                <textarea
                  className="textarea"
                  defaultValue={
                    typeof change.afterPayload === 'string'
                      ? change.afterPayload
                      : JSON.stringify(change.afterPayload)
                  }
                  onChange={(event) => {
                    const text = event.target.value;
                    setModified((current) => ({ ...current, [change.id]: text }));
                  }}
                />
              </label>
            ) : null}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn min-h-11"
        disabled={review.isPending}
        onClick={() => {
          void review
            .mutateAsync({
              projectId,
              proposalId: detail.proposal.id,
              expectedRevision: detail.proposal.revision,
              outcomes: selected,
              idempotencyKey: crypto.randomUUID(),
            })
            .then(() => router.push(projectHref(projectId)));
        }}
      >
        Save review
      </button>
      {errorMessageOf(review.error) === null ? null : (
        <p className="alert">{errorMessageOf(review.error)}</p>
      )}
    </article>
  );
}
