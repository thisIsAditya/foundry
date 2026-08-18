'use client';

import { SendConversationInputSchema, type ConversationEffort } from '@foundry/api-contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import { useProjectStream } from '../../lib/stream/use-project-stream';
import { useTRPC } from '../../lib/trpc/client';
import {
  DOCUMENT_FILE_ACCEPT,
  MAX_CHAT_ATTACHMENTS,
  uploadEvidenceAttachment,
} from '../../lib/upload-evidence';

import { AgentStepTrace } from './agent-step-trace';
import { ConversationMessageView } from './conversation-message-view';

const TOPIC_CHIPS: { id: string; label: string }[] = [
  { id: 'problem', label: 'The problem' },
  { id: 'customer', label: 'My customer' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'competition', label: 'Competition' },
  { id: 'mvp', label: 'What to build first' },
];

const EFFORTS: { id: ConversationEffort; label: string }[] = [
  { id: 'quick', label: 'Quick' },
  { id: 'standard', label: 'Standard' },
  { id: 'thorough', label: 'Thorough' },
];

export function ConversationThread({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const stream = useProjectStream(projectId);
  const idempotencyKey = useRef(crypto.randomUUID());
  const [answer, setAnswer] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);
  const [historyAtSend, setHistoryAtSend] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const history = useQuery(trpc.conversation.list.queryOptions({ projectId, limit: 40 }));
  const createIntent = useMutation(trpc.evidence.createUploadIntent.mutationOptions());
  const confirm = useMutation(trpc.evidence.confirmUpload.mutationOptions());
  const observe = useMutation(trpc.evidence.recordObservation.mutationOptions());
  const mutation = useMutation(
    trpc.conversation.send.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpc.conversation.list.queryKey() });
      },
    }),
  );

  useEffect(() => {
    const node = scroller.current;
    if (node !== null) {
      node.scrollTop = node.scrollHeight;
    }
  }, [history.data?.items.length, stream.transcript, stream.events.length]);

  useEffect(() => {
    if (!mutation.isPending) {
      return;
    }
    const started = [...stream.events].reverse().find((event) => event.type === 'message_started');
    if (started !== undefined) {
      setPendingRunId(started.runId);
    }
  }, [mutation.isPending, stream.events]);

  const historyCount = history.data?.items.length ?? 0;
  useEffect(() => {
    if (historyAtSend !== null && historyCount > historyAtSend) {
      setPendingRunId(null);
      setHistoryAtSend(null);
    }
  }, [historyAtSend, historyCount]);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    try {
      const attachmentIds: string[] = [];
      for (const file of files) {
        const uploaded = await uploadEvidenceAttachment({
          file,
          projectId,
          createIntent: (body) => createIntent.mutateAsync(body),
          confirm: (body) => confirm.mutateAsync(body),
          recordObservation: (body) => observe.mutateAsync(body),
        });
        attachmentIds.push(uploaded.evidenceItemId);
      }
      const input = SendConversationInputSchema.parse({
        projectId,
        text: answer,
        effort: stream.effort,
        ...(attachmentIds.length === 0 ? {} : { attachmentIds }),
        idempotencyKey: idempotencyKey.current,
      });
      await mutation.mutateAsync(input);
      idempotencyKey.current = crypto.randomUUID();
      setHistoryAtSend(historyCount);
      setAnswer('');
      setFiles([]);
      if (textarea.current !== null) {
        textarea.current.style.height = '';
      }
    } catch {
      // Keep the same idempotency key so a retry is safe (02 §7).
    }
  }

  const chronological = [...(history.data?.items ?? [])].reverse();
  const errorMessage =
    errorMessageOf(mutation.error) ??
    errorMessageOf(createIntent.error) ??
    errorMessageOf(confirm.error) ??
    errorMessageOf(observe.error);
  const complete =
    pendingRunId !== null &&
    stream.events.some(
      (event) => event.type === 'message_completed' && event.runId === pendingRunId,
    );

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
        {mutation.isPending || pendingRunId !== null ? (
          <AgentStepTrace
            projectId={projectId}
            events={stream.events}
            runId={pendingRunId ?? ''}
            complete={complete && !mutation.isPending}
          />
        ) : null}
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
        {files.length === 0 ? null : (
          <ul className="flex flex-wrap gap-2" aria-label="Attachments">
            {files.map((file) => (
              <li key={file.name}>
                <button
                  type="button"
                  className="badge"
                  onClick={() => setFiles((current) => current.filter((item) => item !== file))}
                >
                  {file.name} ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <label className="field">
          <span>Message</span>
          <textarea
            ref={textarea}
            className="textarea composer-grow"
            name="answer"
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              event.target.style.height = '0px';
              event.target.style.height = `${String(event.target.scrollHeight)}px`;
            }}
            placeholder="e.g. I think small cafes waste time on scheduling staff."
            required
          />
        </label>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Effort">
          {EFFORTS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={stream.effort === item.id ? 'badge badge-info' : 'badge'}
              aria-pressed={stream.effort === item.id}
              onClick={() => stream.setEffort(item.id)}
            >
              {item.label}
            </button>
          ))}
          <label className="hint">
            Attach
            <input
              className="sr-only"
              type="file"
              multiple
              accept={DOCUMENT_FILE_ACCEPT}
              onChange={(event) =>
                setFiles((current) =>
                  [...current, ...Array.from(event.target.files ?? [])].slice(
                    0,
                    MAX_CHAT_ATTACHMENTS,
                  ),
                )
              }
            />
          </label>
          <button className="btn" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Thinking…' : 'Send'}
          </button>
        </div>
      </form>
      {errorMessage === null ? null : <p className="alert">{errorMessage}</p>}
    </div>
  );
}
