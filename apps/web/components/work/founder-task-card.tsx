'use client';

import type { FounderTask } from '@foundry/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { ConversationMessageView } from '../conversation/conversation-message-view';
import { errorMessageOf } from '../../lib/error-message';
import { scoreDimensionHeading } from '../../lib/format';
import { useTRPC } from '../../lib/trpc/client';

export function FounderTaskCard({
  task,
  selected = false,
  onSelect,
}: {
  task: FounderTask;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      className={selected ? 'card-accent stack text-left' : 'card stack text-left'}
      onClick={onSelect}
    >
      <span className="badge">{task.status.replaceAll('_', ' ')}</span>
      <p className="card-title">{task.title}</p>
      <p className="hint">{task.explanation}</p>
    </button>
  );
}

export function FounderTaskDetail({
  projectId,
  founderTaskId,
}: {
  projectId: string;
  founderTaskId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const task = useQuery(trpc.founderTask.get.queryOptions({ projectId, founderTaskId }));
  const helpKey = useRef(crypto.randomUUID());
  const completeKey = useRef(crypto.randomUUID());
  const [reason, setReason] = useState('');
  const [evidenceId, setEvidenceId] = useState('');
  const interviews = useQuery(trpc.evidence.listInterviews.queryOptions({ projectId }));
  const helpMessages = useQuery(trpc.conversation.list.queryOptions({ projectId, limit: 40 }));

  const help = useMutation(
    trpc.founderTask.requestHelp.mutationOptions({
      onSuccess: async () => {
        helpKey.current = crypto.randomUUID();
        await queryClient.invalidateQueries({ queryKey: trpc.founderTask.get.queryKey() });
        await queryClient.invalidateQueries({ queryKey: trpc.conversation.list.queryKey() });
      },
    }),
  );
  const complete = useMutation(trpc.founderTask.complete.mutationOptions());
  const defer = useMutation(trpc.founderTask.defer.mutationOptions());
  const skip = useMutation(trpc.founderTask.skip.mutationOptions());

  if (task.isLoading) {
    return <p className="muted">Loading task…</p>;
  }
  if (task.isError) {
    return <p className="alert">{task.error.message}</p>;
  }
  if (task.data === undefined) {
    return <p className="muted">Task not found.</p>;
  }
  const item = task.data;
  const helpMessage = helpMessages.data?.items.find(
    (message) => message.id === item.preparation.helpMessageId,
  );

  return (
    <div className="card stack">
      <div>
        <p className="hint">Why this matters</p>
        <h2 className="card-title">{item.title}</h2>
        <p className="text-sm">{item.explanation}</p>
      </div>
      {item.dueOrSuggestedAt === null ? null : (
        <p className="muted">Suggested {item.dueOrSuggestedAt.toLocaleString()}</p>
      )}
      {item.preparation.script === undefined ? null : (
        <div>
          <p className="hint">Script</p>
          <p className="text-sm whitespace-pre-wrap">{item.preparation.script}</p>
        </div>
      )}
      {item.preparation.template === undefined ? null : (
        <div>
          <p className="hint">Template</p>
          <p className="text-sm whitespace-pre-wrap">{item.preparation.template}</p>
        </div>
      )}
      {item.preparation.questionnaire === undefined ? null : (
        <ul className="stack" style={{ gap: '0.35rem' }}>
          {item.preparation.questionnaire.map((question) => (
            <li key={question} className="text-sm">
              {question}
            </li>
          ))}
        </ul>
      )}
      <div>
        <p className="hint">What to record</p>
        <p className="text-sm">{item.evidenceSchema.description}</p>
      </div>
      {item.linkedScoreDimensions.length === 0 ? null : (
        <p className="muted">
          Score impact:{' '}
          {item.linkedScoreDimensions
            .map((dimension) => scoreDimensionHeading(dimension))
            .join(', ')}
        </p>
      )}
      {helpMessage === undefined ? null : (
        <ConversationMessageView projectId={projectId} message={helpMessage} />
      )}
      <div className="flex flex-wrap gap-2">
        <button
          className="btn"
          type="button"
          disabled={help.isPending}
          onClick={() =>
            void help.mutateAsync({
              projectId,
              founderTaskId,
              idempotencyKey: helpKey.current,
            })
          }
        >
          {help.isPending ? 'Preparing…' : 'Help me'}
        </button>
      </div>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (evidenceId.length === 0) {
            return;
          }
          void complete.mutateAsync({
            projectId,
            founderTaskId,
            evidenceRef: { kind: 'evidence', id: evidenceId },
            idempotencyKey: completeKey.current,
          });
        }}
      >
        <label className="field">
          <span>Completion evidence (interview)</span>
          <select
            className="input"
            value={evidenceId}
            onChange={(event) => setEvidenceId(event.target.value)}
            required
          >
            <option value="">Select an interview</option>
            {(interviews.data ?? []).map((entry) => (
              <option key={entry.interview.id} value={entry.interview.id}>
                {entry.interview.participantType} · {entry.quoteCount} quotes
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn"
          type="submit"
          disabled={complete.isPending || evidenceId.length === 0}
        >
          {complete.isPending ? 'Saving…' : 'Complete'}
        </button>
      </form>
      <form
        className="row-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (reason.trim().length === 0) {
            return;
          }
          void defer.mutateAsync({
            projectId,
            founderTaskId,
            reason: reason.trim(),
            idempotencyKey: crypto.randomUUID(),
          });
        }}
      >
        <label className="field">
          <span>Defer or skip reason</span>
          <input
            className="input"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          />
        </label>
        <button className="btn-secondary" type="submit">
          Defer
        </button>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => {
            if (reason.trim().length === 0) {
              return;
            }
            void skip.mutateAsync({
              projectId,
              founderTaskId,
              reason: reason.trim(),
              idempotencyKey: crypto.randomUUID(),
            });
          }}
        >
          Skip
        </button>
      </form>
      {errorMessageOf(help.error) === null ? null : (
        <p className="alert">{errorMessageOf(help.error)}</p>
      )}
      {errorMessageOf(complete.error) === null ? null : (
        <p className="alert">{errorMessageOf(complete.error)}</p>
      )}
    </div>
  );
}
