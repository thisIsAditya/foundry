'use client';

import type { JourneyStage } from '@foundry/domain';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import { useTRPC } from '../../lib/trpc/client';

export function RevisitStage({
  projectId,
  stage,
  expectedRevision,
  mode,
  label,
}: {
  projectId: string;
  stage: JourneyStage;
  expectedRevision: number;
  mode: 'advance' | 'revisit' | 'skip_with_reason';
  label: string;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [reason, setReason] = useState('');
  const revisit = useMutation(trpc.journey.revisitStage.mutationOptions());
  const needsReason = mode !== 'advance';

  return (
    <form
      className="stack-tight"
      onSubmit={(event) => {
        event.preventDefault();
        void revisit
          .mutateAsync({
            projectId,
            stage,
            mode,
            expectedRevision,
            idempotencyKey: crypto.randomUUID(),
            ...(reason.trim().length === 0 ? {} : { reason }),
          })
          .then(() => router.refresh());
      }}
    >
      {needsReason ? (
        <label className="field">
          <span>Reason</span>
          <input
            className="input min-h-11"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required={mode === 'skip_with_reason'}
          />
        </label>
      ) : null}
      <button
        type="submit"
        className="btn-secondary min-h-11"
        disabled={revisit.isPending || (mode === 'skip_with_reason' && reason.trim().length === 0)}
      >
        {label}
      </button>
      {errorMessageOf(revisit.error) === null ? null : (
        <p className="alert">{errorMessageOf(revisit.error)}</p>
      )}
    </form>
  );
}
