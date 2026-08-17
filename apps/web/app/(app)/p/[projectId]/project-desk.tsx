'use client';

import { AnswerClarificationInputSchema } from '@foundry/api-contracts';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';

import { useProjectStream } from '../../../../lib/stream/use-project-stream';
import { useTRPC } from '../../../../lib/trpc/client';

export function ProjectDesk({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const stream = useProjectStream(projectId);
  const idempotencyKey = useRef(crypto.randomUUID());
  const [questionId, setQuestionId] = useState('problem');
  const [answer, setAnswer] = useState('');
  const mutation = useMutation(trpc.project.answerClarification.mutationOptions());

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const input = AnswerClarificationInputSchema.parse({
      projectId,
      questionId,
      answer,
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

  const errorMessage =
    mutation.error !== null &&
    typeof mutation.error === 'object' &&
    'message' in mutation.error &&
    typeof mutation.error.message === 'string'
      ? mutation.error.message
      : null;

  return (
    <main>
      <h1>Project</h1>
      <p>{projectId}</p>
      <form onSubmit={(event) => void onSubmit(event)}>
        <label>
          Question
          <input
            name="questionId"
            value={questionId}
            onChange={(event) => setQuestionId(event.target.value)}
            required
          />
        </label>
        <label>
          Answer
          <textarea
            name="answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Sending…' : 'Answer clarification'}
        </button>
      </form>
      {errorMessage === null ? null : <p role="alert">{errorMessage}</p>}
      <section aria-live="polite">
        <h2>Orchestrator</h2>
        <pre>{stream.transcript}</pre>
      </section>
    </main>
  );
}
