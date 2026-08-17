'use client';

import { InterviewParticipantTypes } from '@foundry/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import { useTRPC } from '../../lib/trpc/client';

export function InterviewCapture({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const interviews = useQuery(trpc.evidence.listInterviews.queryOptions({ projectId }));
  const idempotencyKey = useRef(crypto.randomUUID());
  const [participantType, setParticipantType] =
    useState<(typeof InterviewParticipantTypes)[number]>('non_friend');
  const [consentGiven, setConsentGiven] = useState(true);
  const [quotesText, setQuotesText] = useState('');
  const mutation = useMutation(
    trpc.evidence.addInterview.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpc.evidence.listInterviews.queryKey() });
        await queryClient.invalidateQueries({ queryKey: trpc.project.getDeskSummary.queryKey() });
      },
    }),
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const quotes = quotesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (quotes.length === 0) {
      return;
    }
    try {
      await mutation.mutateAsync({
        projectId,
        participantType,
        consent: { given: consentGiven },
        quotes,
        idempotencyKey: idempotencyKey.current,
      });
      idempotencyKey.current = crypto.randomUUID();
      setQuotesText('');
    } catch {
      // Keep the same idempotency key so a retry is safe (02 §7).
    }
  }

  const items = interviews.data ?? [];

  return (
    <section id="interviews" className="card stack scroll-mt-6">
      <div>
        <h2 className="card-title">Talk to real customers</h2>
        <p className="hint">
          Friends and family do not count as independent validation. Be honest about who you talked
          to.
        </p>
      </div>
      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        <label className="field">
          <span>Who did you talk to?</span>
          <select
            className="input"
            value={participantType}
            onChange={(event) =>
              setParticipantType(event.target.value as (typeof InterviewParticipantTypes)[number])
            }
          >
            {InterviewParticipantTypes.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        {participantType !== 'non_friend' ? (
          <p className="hint">
            This interview will be stored, but it will not count as independent proof.
          </p>
        ) : null}
        <label className="field flex-row items-center gap-2">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(event) => setConsentGiven(event.target.checked)}
          />
          <span>They agreed to have this conversation recorded</span>
        </label>
        <label className="field">
          <span>What did they actually say? (one quote per line)</span>
          <textarea
            className="textarea"
            value={quotesText}
            onChange={(event) => setQuotesText(event.target.value)}
            placeholder="We lose two hours a week reconciling invoices."
            required
          />
        </label>
        <div>
          <button className="btn" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save interview'}
          </button>
        </div>
      </form>
      {errorMessageOf(mutation.error) === null ? null : (
        <p className="alert">{errorMessageOf(mutation.error)}</p>
      )}
      {items.length === 0 ? (
        <p className="hint">No interviews logged yet.</p>
      ) : (
        <ul className="list">
          {items.map((item) => (
            <li key={item.interview.id} className="list-row">
              <span className="text-sm capitalize">
                {item.interview.participantType.replaceAll('_', ' ')}
              </span>
              <span className="muted">
                {item.quoteCount} quote{item.quoteCount === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
