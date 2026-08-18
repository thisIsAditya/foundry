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

// How close to the bottom (in px) still counts as "at the bottom" for
// auto-scroll purposes, and the max height the composer grows to before it
// scrolls internally instead of pushing the message list off-screen.
const SCROLL_BOTTOM_THRESHOLD_PX = 96;
const COMPOSER_MAX_HEIGHT_PX = 200;

export function ConversationThread({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const stream = useProjectStream(projectId);
  const idempotencyKey = useRef(crypto.randomUUID());
  const [answer, setAnswer] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);
  const [historyAtSend, setHistoryAtSend] = useState<number | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
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
    if (node !== null && stickToBottom) {
      node.scrollTop = node.scrollHeight;
    }
  }, [history.data?.items.length, stream.transcript, stream.events.length, stickToBottom]);

  // The textarea grows with content (up to COMPOSER_MAX_HEIGHT_PX) whether the
  // user typed or a suggested topic chip set the value programmatically.
  useEffect(() => {
    const node = textarea.current;
    if (node === null) {
      return;
    }
    node.style.height = '0px';
    node.style.height = `${String(node.scrollHeight)}px`;
  }, [answer]);

  function onScroll(): void {
    const node = scroller.current;
    if (node === null) {
      return;
    }
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    setStickToBottom(distanceFromBottom < SCROLL_BOTTOM_THRESHOLD_PX);
  }

  function jumpToLatest(): void {
    const node = scroller.current;
    if (node !== null) {
      node.scrollTop = node.scrollHeight;
    }
    setStickToBottom(true);
  }

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
    if (answer.trim().length === 0 || mutation.isPending) {
      return;
    }
    try {
      setStickToBottom(true);
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
        textarea.current.focus();
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
    <div className="chat-shell">
      <div className="chat-viewport">
        <div ref={scroller} className="chat-scroll" onScroll={onScroll} aria-label="Conversation">
          {history.isLoading ? <p className="muted">Loading the conversation…</p> : null}
          {history.isError ? <p className="alert">{history.error.message}</p> : null}
          {history.isSuccess && chronological.length === 0 ? (
            <div className="chat-empty">
              <p className="text-sm font-medium">Ask your co-founder anything</p>
              <p className="hint">No right answer required — start with what's on your mind.</p>
            </div>
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
          {(mutation.isPending || pendingRunId !== null) && stream.transcript.length > 0 ? (
            <p className="muted whitespace-pre-wrap" aria-live="polite">
              {stream.transcript}
            </p>
          ) : null}
        </div>
        {stickToBottom ? null : (
          <button type="button" className="chat-jump-btn" onClick={jumpToLatest}>
            <ArrowDownGlyph />
            New messages
          </button>
        )}
      </div>
      <form className="chat-composer" onSubmit={(event) => void onSubmit(event)}>
        {chronological.length > 0 ? null : (
          <div className="chat-topics" role="group" aria-label="Suggested topics">
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
        )}
        {errorMessage === null ? null : <p className="alert px-1">{errorMessage}</p>}
        <div className="chat-composer-box">
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
          <textarea
            ref={textarea}
            className="chat-composer-textarea"
            aria-label="Message"
            name="answer"
            rows={1}
            style={{ maxHeight: `${String(COMPOSER_MAX_HEIGHT_PX)}px` }}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="e.g. I think small cafes waste time on scheduling staff."
            required
          />
          <div className="chat-composer-toolbar">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Effort">
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
              <label className="chat-composer-icon-btn" aria-label="Attach files">
                <AttachGlyph />
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
            </div>
            <button
              className="chat-composer-send"
              type="submit"
              disabled={mutation.isPending || answer.trim().length === 0}
              aria-label={mutation.isPending ? 'Sending' : 'Send message'}
            >
              {mutation.isPending ? <SpinnerGlyph /> : <SendGlyph />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function SendGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path fill="currentColor" d="M8 3 12 9 9.3 9 9.3 13 6.7 13 6.7 9 4 9Z" />
    </svg>
  );
}

function AttachGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

function ArrowDownGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
      <path fill="currentColor" d="M8 13 12 7 9.3 7 9.3 3 6.7 3 6.7 7 4 7Z" />
    </svg>
  );
}

function SpinnerGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="chat-spin size-4" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M8 2a6 6 0 1 0 6 6"
      />
    </svg>
  );
}
