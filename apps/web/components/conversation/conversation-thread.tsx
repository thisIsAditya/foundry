'use client';

import { SendConversationInputSchema } from '@foundry/api-contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import { useProjectStream } from '../../lib/stream/use-project-stream';
import { useTRPC } from '../../lib/trpc/client';

import { ConversationMessageView } from './conversation-message-view';

const TOPIC_CHIPS: { id: string; label: string }[] = [
  { id: 'problem', label: 'The problem' },
  { id: 'customer', label: 'My customer' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'competition', label: 'Competition' },
  { id: 'mvp', label: 'What to build first' },
];

export function ConversationThread({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const stream = useProjectStream(projectId);
  const idempotencyKey = useRef(crypto.randomUUID());
  const [answer, setAnswer] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const history = useQuery(trpc.conversation.list.queryOptions({ projectId, limit: 40 }));
  const mutation = useMutation(
    trpc.conversation.send.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpc.conversation.list.queryKey() });
      },
    }),
  );

  useEffect(() => {
    stream.markRead();
  }, [stream, history.data?.items.length]);

  useEffect(() => {
    const node = scroller.current;
    if (node !== null) {
      node.scrollTop = node.scrollHeight;
    }
  }, [history.data?.items.length, stream.transcript]);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const input = SendConversationInputSchema.parse({
      projectId,
      text: answer,
      idempotencyKey: idempotencyKey.current,
    });
    try {
      await mutation.mutateAsync(input);
      idempotencyKey.current = crypto.randomUUID();
      setAnswer('');
    } catch {
      // Keep the same idempotency key so a retry is safe (02 §7).
    }
  }

  const chronological = [...(history.data?.items ?? [])].reverse();
  const errorMessage = errorMessageOf(mutation.error);

  return (
    <div className="stack">
      <div ref={scroller} className="stack" aria-label="Conversation">
        {history.isLoading ? <p className="muted">Loading the conversation…</p> : null}
        {history.isError ? <p className="alert">{history.error.message}</p> : null}
        {history.isSuccess && chronological.length === 0 ? (
          <p className="hint">Ask anything about the idea. No right answer required.</p>
        ) : null}
        {chronological.map((message) => (
          <ConversationMessageView key={message.id} projectId={projectId} message={message} />
        ))}
        {stream.transcript.length === 0 ? null : (
          <p className="muted whitespace-pre-wrap" aria-live="polite">
            {stream.transcript}
          </p>
        )}
      </div>
      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested topics">
          {TOPIC_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="badge"
              onClick={() =>
                setAnswer((current) => (current.length > 0 ? current : `${chip.label}: `))
              }
            >
              {chip.label}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Message</span>
          <textarea
            className="textarea"
            name="answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="e.g. I think small cafes waste time on scheduling staff."
            required
          />
        </label>
        <div>
          <button className="btn" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Thinking…' : 'Send'}
          </button>
        </div>
      </form>
      {errorMessage === null ? null : <p className="alert">{errorMessage}</p>}
    </div>
  );
}
