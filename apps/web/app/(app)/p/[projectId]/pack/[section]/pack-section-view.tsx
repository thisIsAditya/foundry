'use client';

import { PackSectionKeys } from '@foundry/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRef, useState } from 'react';

import { Checklist, type ChecklistItem } from '../../../../../../components/ui/checklist';
import { EmptyState } from '../../../../../../components/ui/empty-state';
import {
  formatUnknown,
  packFieldLabel,
  packSectionDescription,
  packSectionLabel,
} from '../../../../../../lib/format';
import { useTRPC } from '../../../../../../lib/trpc/client';

function errorMessageOf(error: unknown): string | null {
  return error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : null;
}

function PendingRevisionPanel({
  projectId,
  section,
  currentRevisionId,
  pendingRevisionId,
}: {
  projectId: string;
  section: string;
  currentRevisionId: string;
  pendingRevisionId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const acceptKey = useRef(crypto.randomUUID());
  const rejectKey = useRef(crypto.randomUUID());
  const [reason, setReason] = useState('');

  const diff = useQuery(
    trpc.pack.getDiff.queryOptions({
      projectId,
      fromRevision: currentRevisionId,
      toRevision: pendingRevisionId,
    }),
  );

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: trpc.pack.getSection.queryKey() });
    await queryClient.invalidateQueries({ queryKey: trpc.pack.getDiff.queryKey() });
    await queryClient.invalidateQueries({ queryKey: trpc.project.getDeskSummary.queryKey() });
  };

  const accept = useMutation(
    trpc.pack.acceptRevision.mutationOptions({
      onSuccess: async () => {
        acceptKey.current = crypto.randomUUID();
        await invalidate();
      },
    }),
  );
  const reject = useMutation(
    trpc.pack.rejectRevision.mutationOptions({
      onSuccess: async () => {
        rejectKey.current = crypto.randomUUID();
        setReason('');
        await invalidate();
      },
    }),
  );

  async function onAccept(): Promise<void> {
    try {
      await accept.mutateAsync({
        projectId,
        revisionId: pendingRevisionId,
        expectedRevision: pendingRevisionId,
        idempotencyKey: acceptKey.current,
      });
    } catch {
      // Keep the same idempotency key so a retry is safe (02 §7).
    }
  }

  async function onReject(): Promise<void> {
    if (reason.trim().length === 0) {
      return;
    }
    try {
      await reject.mutateAsync({
        projectId,
        revisionId: pendingRevisionId,
        reason: reason.trim(),
        idempotencyKey: rejectKey.current,
      });
    } catch {
      // Keep the same idempotency key so a retry is safe (02 §7).
    }
  }

  const fromBody = diff.data?.from.find((item) => item.section === section)?.body;
  const toBody = diff.data?.to.find((item) => item.section === section)?.body;

  return (
    <section className="callout">
      <p className="callout-eyebrow">Waiting on you</p>
      <p className="callout-title">Your AI co-founder proposed a change to this section</p>
      <p className="text-sm text-text-muted">
        Compare what&apos;s live today against what&apos;s proposed, then accept it or send it back
        with a reason.
      </p>
      {diff.isLoading ? <p className="muted">Loading the comparison…</p> : null}
      {diff.isSuccess ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="hint mb-1">Live now</p>
            <SectionBody body={fromBody} />
          </div>
          <div>
            <p className="hint mb-1">Proposed</p>
            <SectionBody body={toBody} />
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="btn"
          type="button"
          disabled={accept.isPending}
          onClick={() => void onAccept()}
        >
          {accept.isPending ? 'Accepting…' : 'Accept this change'}
        </button>
        <input
          className="input"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Why send it back? (required to reject)"
        />
        <button
          className="btn-secondary"
          type="button"
          disabled={reject.isPending || reason.trim().length === 0}
          onClick={() => void onReject()}
        >
          {reject.isPending ? 'Sending back…' : 'Send back'}
        </button>
      </div>
      {errorMessageOf(accept.error) === null ? null : (
        <p className="alert">{errorMessageOf(accept.error)}</p>
      )}
      {errorMessageOf(reject.error) === null ? null : (
        <p className="alert">{errorMessageOf(reject.error)}</p>
      )}
    </section>
  );
}

export function PackSectionView({ projectId, section }: { projectId: string; section: string }) {
  const trpc = useTRPC();
  const query = useQuery(
    trpc.pack.getSection.queryOptions({
      projectId,
      section: section as (typeof PackSectionKeys)[number],
    }),
  );
  const desk = useQuery(trpc.project.getDeskSummary.queryOptions({ projectId }));
  const body = query.data?.body;
  const currentRevisionId = desk.data?.packRevisionId ?? null;
  const pendingRevisionId = desk.data?.pendingPackRevisionId ?? null;

  return (
    <div className="stack">
      <header>
        <h1 className="page-title">{packSectionLabel(section)}</h1>
        <p className="lede">{packSectionDescription(section)}</p>
      </header>
      <nav className="flex flex-wrap gap-3" aria-label="Pack sections">
        {PackSectionKeys.map((key) => (
          <Link
            key={key}
            href={`/p/${projectId}/pack/${key}`}
            className="badge no-underline hover:text-text"
            aria-current={key === section ? 'page' : undefined}
          >
            {packSectionLabel(key)}
          </Link>
        ))}
      </nav>
      {currentRevisionId !== null && pendingRevisionId !== null ? (
        <PendingRevisionPanel
          projectId={projectId}
          section={section}
          currentRevisionId={currentRevisionId}
          pendingRevisionId={pendingRevisionId}
        />
      ) : null}
      {query.isError ? <p className="alert">{query.error.message}</p> : null}
      {query.isLoading ? <p className="muted">Loading…</p> : null}
      {query.isSuccess ? (
        <div className="card">
          <SectionBody body={body} />
        </div>
      ) : null}
    </div>
  );
}

function isKillLineArray(
  value: unknown,
): value is { name: string; threshold: string; window: string }[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'threshold' in item &&
        'window' in item &&
        'name' in item,
    )
  );
}

function isChecklistArray(value: unknown): value is { id: string; label: string; done: boolean }[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === 'object' && item !== null && 'label' in item && 'done' in item,
    )
  );
}

function isLogArray(value: unknown): value is { at: string; note: string }[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === 'object' && item !== null && 'note' in item && 'at' in item,
    )
  );
}

function isOpenQuestionArray(
  value: unknown,
): value is { id: string; question: string; status: string }[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === 'object' && item !== null && 'question' in item && 'status' in item,
    )
  );
}

function FieldValue({ value }: { value: unknown }) {
  if (isChecklistArray(value)) {
    if (value.length === 0) {
      return <p className="muted">Nothing on the checklist yet.</p>;
    }
    const items: ChecklistItem[] = value.map((item) => ({
      id: item.id,
      label: item.label,
      done: item.done,
    }));
    return <Checklist items={items} />;
  }
  if (isKillLineArray(value)) {
    if (value.length === 0) {
      return <p className="muted">No kill conditions set yet.</p>;
    }
    return (
      <ul className="stack" style={{ gap: '0.5rem' }}>
        {value.map((line, index) => (
          <li key={`${line.name}-${String(index)}`} className="text-sm">
            Stop if <strong>{line.name}</strong> crosses {line.threshold} within {line.window}.
          </li>
        ))}
      </ul>
    );
  }
  if (isLogArray(value)) {
    if (value.length === 0) {
      return <p className="muted">Nothing logged yet.</p>;
    }
    return (
      <ul className="stack" style={{ gap: '0.5rem' }}>
        {value.map((entry, index) => (
          <li key={`${entry.at}-${String(index)}`} className="text-sm">
            {entry.note} <span className="hint">— {new Date(entry.at).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (isOpenQuestionArray(value)) {
    if (value.length === 0) {
      return <p className="muted">No open questions recorded.</p>;
    }
    return (
      <ul className="stack" style={{ gap: '0.5rem' }}>
        {value.map((item) => (
          <li key={item.id} className="text-sm">
            {item.question} <span className="badge">{item.status}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <p className="text-sm whitespace-pre-wrap">{formatUnknown(value)}</p>;
}

function SectionBody({ body }: { body: unknown }) {
  if (body === null || body === undefined) {
    return (
      <EmptyState
        title="Nothing recorded here yet"
        description="Your AI co-founder fills this in as sprints run, or you can answer clarifying questions on the desk to speed it up."
      />
    );
  }
  if (typeof body !== 'object' || Array.isArray(body)) {
    return <p className="text-sm">{formatUnknown(body)}</p>;
  }
  const entries = Object.entries(body);
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Nothing recorded here yet"
        description="Your AI co-founder fills this in as sprints run."
      />
    );
  }
  return (
    <dl className="list">
      {entries.map(([key, value]) => (
        <div key={key} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-6">
          <dt className="muted">{packFieldLabel(key)}</dt>
          <dd>
            <FieldValue value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
