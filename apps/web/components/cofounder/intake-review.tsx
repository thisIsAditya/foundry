'use client';

import { useQuery } from '@tanstack/react-query';

import { useTRPC } from '../../lib/trpc/client';
import { CofounderThread } from './cofounder-thread';

const INTAKE_PROMPT =
  'Please review the idea and source material I provided during setup. Use only processed venture sources, then prepare reviewable, cited model proposals for clearly supported sections. Do not accept changes or claim validation.';

function statusCopy(status: string): string {
  switch (status) {
    case 'pending':
    case 'uploaded':
    case 'processing':
      return 'Processing';
    case 'ready':
      return 'Ready for review';
    case 'failed':
      return 'Could not be processed';
    default:
      return status;
  }
}

export function IntakeReview({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const sources = useQuery({
    ...trpc.evidence.list.queryOptions({ projectId }),
    refetchInterval: (query) =>
      query.state.data?.some((source) =>
        ['pending', 'uploaded', 'processing'].includes(source.status),
      ) === true
        ? 1_500
        : false,
  });
  const items = sources.data ?? [];
  const processing = items.some((item) =>
    ['pending', 'uploaded', 'processing'].includes(item.status),
  );
  const terminal = sources.isSuccess && !processing;
  const prompt = terminal ? INTAKE_PROMPT : undefined;

  return (
    <article className="stack">
      <header>
        <p className="callout-eyebrow">Co-founder intake</p>
        <h1 className="page-title">Turn your starting research into reviewable model drafts</h1>
        <p className="lede">
          Your narrative and files stay founder-supplied material. The co-founder will prepare
          proposals with source references; you decide what enters the business record.
        </p>
      </header>
      <section className="panel stack-tight" aria-live="polite">
        <h2 className="card-title">Source processing</h2>
        {sources.isLoading ? <p className="hint">Checking your intake material…</p> : null}
        {sources.isError ? <p className="alert">{sources.error.message}</p> : null}
        {sources.isSuccess && items.length === 0 ? (
          <p className="hint">
            No files were attached. The co-founder will start from the narrative you provided.
          </p>
        ) : null}
        {items.length === 0 ? null : (
          <ul className="list">
            {items.map((source) => (
              <li key={source.id} className="list-row">
                <span className="text-sm">{source.originalFilename ?? source.kind}</span>
                <span className="badge">{statusCopy(source.status)}</span>
              </li>
            ))}
          </ul>
        )}
        {processing ? (
          <p className="hint">
            The co-founder will begin the review when every attached source is ready or has a
            visible processing failure.
          </p>
        ) : (
          <p className="hint">
            Drafts remain proposals until you accept, modify, or keep the current value.
          </p>
        )}
      </section>
      <CofounderThread
        projectId={projectId}
        {...(prompt === undefined ? {} : { initialPrompt: prompt })}
      />
    </article>
  );
}
