'use client';

import type { Journey, JourneyStep as JourneyStepModel, RecordSectionKey } from '@foundry/domain';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import { projectHref, projectModelHref } from '../../lib/project-href';
import { useTRPC } from '../../lib/trpc/client';

export function StepActions({
  projectId,
  step,
  journey,
  recordSection,
  recordSaved,
  alreadyCaptured,
}: {
  projectId: string;
  step: JourneyStepModel;
  journey: Journey;
  recordSection: RecordSectionKey | null;
  recordSaved: boolean;
  alreadyCaptured: boolean;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [reason, setReason] = useState('');
  const start = useMutation(trpc.journey.startStep.mutationOptions());
  const submit = useMutation(trpc.journey.submitStep.mutationOptions());
  const defer = useMutation(trpc.journey.deferStep.mutationOptions());
  const advance = useMutation(trpc.journey.revisitStage.mutationOptions());
  const pending = start.isPending || submit.isPending || defer.isPending || advance.isPending;
  const error =
    errorMessageOf(start.error) ??
    errorMessageOf(submit.error) ??
    errorMessageOf(defer.error) ??
    errorMessageOf(advance.error);
  const canStart = ['ready', 'deferred'].includes(step.status);
  const canComplete = ['in_progress', 'awaiting_founder'].includes(step.status);

  return (
    <div className="stack">
      {alreadyCaptured ? (
        <section className="panel stack-tight">
          <h2 className="card-title">Your idea is already recorded</h2>
          <p className="hint">
            You entered it when you created this venture. Goal, geography, constraints, and urgency
            are optional context—not a required detour.
          </p>
          <button
            type="button"
            className="btn min-h-11 self-start"
            disabled={pending}
            onClick={() => {
              void advance
                .mutateAsync({
                  projectId,
                  stage: 'problem',
                  mode: 'advance',
                  expectedRevision: journey.revision,
                  idempotencyKey: crypto.randomUUID(),
                })
                .then(() => router.push(projectHref(projectId)));
            }}
          >
            Continue to Problem
          </button>
        </section>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {alreadyCaptured || !canStart ? null : (
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
            Start this step
          </button>
        )}
        {alreadyCaptured || !canComplete ? null : (
          <button
            type="button"
            className="btn min-h-11"
            disabled={pending || !recordSaved}
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
            Mark step complete
          </button>
        )}
      </div>
      {alreadyCaptured || recordSaved || !canComplete ? null : (
        <p className="hint">Save the founder input above before marking this step complete.</p>
      )}
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
          href={projectModelHref(projectId, recordSection ?? undefined)}
        >
          {recordSection === null ? 'Open the record' : 'Open this record section'}
        </a>
      </div>
      {error === null ? null : <p className="alert">{error}</p>}
    </div>
  );
}
