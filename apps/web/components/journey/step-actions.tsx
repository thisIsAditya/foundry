'use client';

import type { JourneyStep as JourneyStepModel } from '@foundry/domain';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import { projectHref, projectModelHref } from '../../lib/project-href';
import { useTRPC } from '../../lib/trpc/client';

export function StepActions({ projectId, step }: { projectId: string; step: JourneyStepModel }) {
  const trpc = useTRPC();
  const router = useRouter();
  const [reason, setReason] = useState('');
  const start = useMutation(trpc.journey.startStep.mutationOptions());
  const submit = useMutation(trpc.journey.submitStep.mutationOptions());
  const defer = useMutation(trpc.journey.deferStep.mutationOptions());
  const pending = start.isPending || submit.isPending || defer.isPending;
  const error =
    errorMessageOf(start.error) ?? errorMessageOf(submit.error) ?? errorMessageOf(defer.error);

  return (
    <div className="stack">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn min-h-11"
          disabled={pending}
          onClick={() => {
            void start
              .mutateAsync({
                projectId,
                stepId: step.id,
                expectedRevision: step.revision,
                idempotencyKey: crypto.randomUUID(),
              })
              .then(() => router.refresh());
          }}
        >
          Start
        </button>
        <button
          type="button"
          className="btn-secondary min-h-11"
          disabled={pending}
          onClick={() => {
            void submit
              .mutateAsync({
                projectId,
                stepId: step.id,
                expectedRevision: step.revision,
                idempotencyKey: crypto.randomUUID(),
              })
              .then(() => router.push(projectHref(projectId)));
          }}
        >
          Submit this step
        </button>
      </div>
      <label className="field">
        <span>Defer or skip with a reason</span>
        <textarea
          className="textarea"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary min-h-11"
          disabled={pending || reason.trim().length === 0}
          onClick={() => {
            void defer
              .mutateAsync({
                projectId,
                stepId: step.id,
                expectedRevision: step.revision,
                reason,
                skip: false,
                idempotencyKey: crypto.randomUUID(),
              })
              .then(() => router.refresh());
          }}
        >
          Defer
        </button>
        <button
          type="button"
          className="btn-secondary min-h-11"
          disabled={pending || reason.trim().length === 0}
          onClick={() => {
            void defer
              .mutateAsync({
                projectId,
                stepId: step.id,
                expectedRevision: step.revision,
                reason,
                skip: true,
                idempotencyKey: crypto.randomUUID(),
              })
              .then(() => router.refresh());
          }}
        >
          Skip with reason
        </button>
        <a
          className="btn-secondary min-h-11 inline-flex items-center"
          href={projectModelHref(projectId)}
        >
          Open the record
        </a>
      </div>
      {error === null ? null : <p className="alert">{error}</p>}
    </div>
  );
}
