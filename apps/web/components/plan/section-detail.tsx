'use client';

import {
  BusinessModelSectionKeySchema,
  PackSectionKeyToBusinessModelSectionKey,
  PackSectionKeys,
} from '@foundry/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRef, useState } from 'react';

import { InterviewCapture } from '../evidence/interview-capture';
import { Checklist, type ChecklistItem } from '../ui/checklist';
import { EmptyState } from '../ui/empty-state';
import { errorMessageOf } from '../../lib/error-message';
import {
  businessModelSectionLabel,
  formatUnknown,
  packFieldLabel,
} from '../../lib/format';
import { projectPanelHref } from '../../lib/project-href';
import { useTRPC } from '../../lib/trpc/client';
import { SectionStatusBadge } from './section-status-badge';

export function BusinessModelSectionView({
  projectId,
  section,
}: {
  projectId: string;
  section: string;
}) {
  const parsed = BusinessModelSectionKeySchema.safeParse(section);
  const key = parsed.success ? parsed.data : 'context';
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const detail = useQuery(trpc.pack.getBusinessModelSection.queryOptions({ projectId, key }));
  const desk = useQuery(trpc.project.getDeskSummary.queryOptions({ projectId }));
  const revisions = useQuery(trpc.pack.listRevisions.queryOptions({ projectId }));
  const score = useQuery(trpc.score.getCurrent.queryOptions({ projectId }));
  const draft = (revisions.data ?? []).find((item) => item.status === 'draft');
  const accepted = desk.data?.packRevisionId ?? null;
  const acceptKey = useRef(crypto.randomUUID());
  const acceptAllKey = useRef(crypto.randomUUID());
  const rejectKey = useRef(crypto.randomUUID());
  const [reason, setReason] = useState('');
  const [unsafeWarning, setUnsafeWarning] = useState<string[] | null>(null);

  const diff = useQuery({
    ...trpc.pack.getDiff.queryOptions({
      projectId,
      fromRevision: accepted ?? '00000000-0000-4000-8000-000000000000',
      toRevision: draft?.id ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: accepted !== null && draft !== undefined,
  });
  const draftScore = useQuery({
    ...trpc.score.getForRevision.queryOptions({
      projectId,
      revisionId: draft?.id ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: draft !== undefined,
  });
  const explanation = useQuery({
    ...trpc.pack.explainChange.queryOptions({
      projectId,
      revisionId: draft?.id ?? '00000000-0000-4000-8000-000000000000',
      sectionKey: key,
    }),
    enabled: draft !== undefined,
  });

  const acceptSection = useMutation(
    trpc.pack.acceptSection.mutationOptions({
      onSuccess: async () => {
        acceptKey.current = crypto.randomUUID();
        await queryClient.invalidateQueries({ queryKey: trpc.pack.getBusinessModelSection.queryKey() });
      },
    }),
  );
  const acceptAll = useMutation(
    trpc.pack.acceptAllSafeSections.mutationOptions({
      onSuccess: async (result) => {
        acceptAllKey.current = crypto.randomUUID();
        setUnsafeWarning(result.skippedUnsafeKeys);
        await queryClient.invalidateQueries({ queryKey: trpc.pack.listBusinessModelSections.queryKey() });
      },
    }),
  );
  const reject = useMutation(trpc.pack.rejectRevision.mutationOptions());

  const card = detail.data?.card;
  const showGateA = key === 'evidence_ledger' || key === 'willingness_to_pay';

  return (
    <div className="stack">
      <header>
        <p className="hint">
          <Link href={projectPanelHref(projectId, 'plan')}>Business model</Link>
        </p>
        <h1 className="page-title">{businessModelSectionLabel(key)}</h1>
        {card === undefined ? null : <SectionStatusBadge status={card.status} />}
        <p className="lede">
          {card?.summary ||
            'This section is a projection over the live plan. Empty fields are missing, not validated.'}
        </p>
      </header>
      {detail.isLoading ? <p className="muted">Loading section…</p> : null}
      {detail.isError ? <p className="alert">{detail.error.message}</p> : null}
      {card === undefined ? null : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="card stack lg:col-span-2">
            <h2 className="card-title">Content</h2>
            {card.knownFacts.length === 0 && card.assumptions.length === 0 ? (
              <EmptyState
                title="Nothing recorded here yet"
                description="The initial draft fills this with labeled assumptions. Research can replace them with citations."
              />
            ) : null}
            {card.knownFacts.length === 0 ? null : (
              <div>
                <p className="hint">Known</p>
                <ul className="stack" style={{ gap: '0.35rem' }}>
                  {card.knownFacts.map((fact) => (
                    <li key={fact} className="text-sm">
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {card.assumptions.length === 0 ? null : (
              <div>
                <p className="hint">Assumptions — not facts</p>
                <ul className="stack" style={{ gap: '0.35rem' }}>
                  {card.assumptions.map((item) => (
                    <li key={item} className="text-sm">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <PackCanonicalBody projectId={projectId} sectionKey={key} />
          </section>
          <aside className="stack">
            <section className="card stack">
              <h2 className="card-title">Evidence</h2>
              <p className="muted">{card.citations.length} citations</p>
              <Link href={projectPanelHref(projectId, 'research')}>Open research</Link>
            </section>
            <section className="card stack">
              <h2 className="card-title">Score</h2>
              <p className="text-sm">
                Current {score.data === null || score.data === undefined ? '—' : Math.round(score.data.overall)}
                {draftScore.data === null || draftScore.data === undefined
                  ? ''
                  : ` → draft ${Math.round(draftScore.data.overall)}`}
              </p>
              <p className="hint">{card.nextAction}</p>
            </section>
          </aside>
        </div>
      )}
      {showGateA && desk.data !== undefined ? (
        <GateACard
          qualifying={desk.data.gateA.qualifyingInterviews}
          required={desk.data.gateA.requiredInterviews}
          passed={desk.data.gateA.passed}
          checks={desk.data.gateA.checks}
        />
      ) : null}
      {showGateA ? <InterviewCapture projectId={projectId} /> : null}
      {draft === undefined || accepted === null ? null : (
        <section className="callout stack">
          <p className="callout-eyebrow">Plan revision</p>
          <p className="callout-title">Review this section before accepting money or pricing changes</p>
          {explanation.data === undefined ? null : (
            <p className="text-sm">{explanation.data.explanation}</p>
          )}
          {diff.isLoading ? <p className="muted">Loading the comparison…</p> : null}
          {diff.data === undefined ? null : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="hint">Live now</p>
                <p className="text-sm whitespace-pre-wrap">
                  {formatUnknown(diff.data.from.find((item) => mappedPackKey(item.section) === key)?.body)}
                </p>
              </div>
              <div>
                <p className="hint">Proposed</p>
                <p className="text-sm whitespace-pre-wrap">
                  {formatUnknown(diff.data.to.find((item) => mappedPackKey(item.section) === key)?.body)}
                </p>
              </div>
            </div>
          )}
          {unsafeWarning === null ? null : (
            <p className="alert">
              Left pending because they touch price, unit, currency, or cost:{' '}
              {unsafeWarning.join(', ')}.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              className="btn"
              type="button"
              onClick={() =>
                void acceptSection.mutateAsync({
                  projectId,
                  revisionId: draft.id,
                  sectionKey: key,
                  expectedRevision: draft.id,
                  idempotencyKey: acceptKey.current,
                })
              }
            >
              Accept this section
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() =>
                void acceptAll.mutateAsync({
                  projectId,
                  revisionId: draft.id,
                  expectedRevision: draft.id,
                  idempotencyKey: acceptAllKey.current,
                })
              }
            >
              Accept all safe sections
            </button>
          </div>
          <div className="row-form">
            <input
              className="input"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why send it back?"
            />
            <button
              className="btn-secondary"
              type="button"
              disabled={reason.trim().length === 0}
              onClick={() =>
                void reject.mutateAsync({
                  projectId,
                  revisionId: draft.id,
                  reason: reason.trim(),
                  idempotencyKey: rejectKey.current,
                })
              }
            >
              Reject
            </button>
          </div>
          {errorMessageOf(acceptSection.error) === null ? null : (
            <p className="alert">{errorMessageOf(acceptSection.error)}</p>
          )}
        </section>
      )}
      <section className="card stack">
        <h2 className="card-title">Revision history</h2>
        <ul className="list">
          {(detail.data?.revisionHistory ?? []).map((item) => (
            <li key={item.id} className="list-row">
              <span className="text-sm">Revision {item.revisionNumber}</span>
              <span className="badge">{item.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function mappedPackKey(section: string): string {
  const parsed = PackSectionKeys.find((item) => item === section);
  if (parsed === undefined) {
    return section;
  }
  return PackSectionKeyToBusinessModelSectionKey[parsed];
}

function PackCanonicalBody({
  projectId,
  sectionKey,
}: {
  projectId: string;
  sectionKey: string;
}) {
  const packKey = (Object.entries(PackSectionKeyToBusinessModelSectionKey) as [string, string][]).find(
    ([, value]) => value === sectionKey,
  )?.[0];
  const trpc = useTRPC();
  const query = useQuery({
    ...trpc.pack.getSection.queryOptions({
      projectId,
      section: (packKey ?? 'mvbp') as (typeof PackSectionKeys)[number],
    }),
    enabled: packKey !== undefined,
  });
  if (packKey === undefined || query.data === undefined) {
    return null;
  }
  const body = query.data.body;
  if (body === null || body === undefined || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }
  return (
    <dl className="list">
      {Object.entries(body).map(([field, value]) => (
        <div key={field} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-6">
          <dt className="muted">{packFieldLabel(field)}</dt>
          <dd className="text-sm whitespace-pre-wrap">{formatUnknown(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function GateACard({
  qualifying,
  required,
  passed,
  checks,
}: {
  qualifying: number;
  required: number;
  passed: boolean;
  checks: { id: string; passed: boolean; detail: string }[];
}) {
  const items: ChecklistItem[] = checks.map((check) => ({
    id: check.id,
    label: check.detail,
    done: check.passed,
  }));
  const percent = required === 0 ? 0 : Math.min(100, Math.round((qualifying / required) * 100));
  return (
    <section className="card stack">
      <h2 className="card-title">Proof checklist (Gate A)</h2>
      <p className="hint">
        {passed
          ? 'Independent interviews are in place.'
          : `${String(qualifying)} of ${String(required)} real-customer interviews.`}
      </p>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${String(percent)}%` }} />
      </div>
      <Checklist items={items} />
    </section>
  );
}
