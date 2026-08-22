'use client';

import { InterviewParticipantTypes, type InterviewParticipantType } from '@foundry/domain';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import { useTRPC } from '../../lib/trpc/client';

export function CaptureForm({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const capture = useMutation(trpc.journey.captureEvidence.mutationOptions());
  const [kind, setKind] = useState<'observation' | 'interview' | 'source' | 'assumption'>(
    'observation',
  );
  const [summary, setSummary] = useState('');
  const [participantType, setParticipantType] = useState<InterviewParticipantType>('known_contact');
  const [consentGiven, setConsentGiven] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = summary.trim();
    if (trimmed.length === 0) {
      return;
    }
    await capture.mutateAsync({
      projectId,
      kind,
      summary: trimmed,
      idempotencyKey: crypto.randomUUID(),
      ...(kind === 'interview' ? { participantType, consentGiven } : {}),
    });
    setSummary('');
    setConsentGiven(false);
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={(event) => void onSubmit(event)}>
      <label className="field">
        <span>What kind of capture is this?</span>
        <select
          className="input"
          value={kind}
          onChange={(event) => setKind(event.target.value as typeof kind)}
        >
          <option value="observation">Observation</option>
          <option value="interview">Interview note</option>
          <option value="source">Source note</option>
          <option value="assumption">Assumption</option>
        </select>
      </label>
      {kind === 'interview' ? (
        <>
          <label className="field">
            <span>Who did you talk to?</span>
            <select
              className="input"
              value={participantType}
              onChange={(event) =>
                setParticipantType(event.target.value as InterviewParticipantType)
              }
            >
              {InterviewParticipantTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          {participantType === 'non_friend' ? null : (
            <p className="hint">
              This interview will be stored, but it will not count as independent proof.
            </p>
          )}
          <label className="field flex-row items-center gap-2">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(event) => setConsentGiven(event.target.checked)}
            />
            <span>They agreed to have this conversation recorded</span>
          </label>
        </>
      ) : null}
      <label className="field">
        <span>Note</span>
        <textarea
          className="textarea"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          required
        />
        <p className="hint">
          A note is not proof. Provenance stays founder input or unverified until you accept a
          proposal. Consent is never inferred.
        </p>
      </label>
      <button
        className="btn min-h-11"
        type="submit"
        disabled={capture.isPending || summary.trim().length === 0}
      >
        {capture.isPending ? 'Saving…' : 'Save to the evidence ledger'}
      </button>
      {errorMessageOf(capture.error) === null ? null : (
        <p className="alert">{errorMessageOf(capture.error)}</p>
      )}
    </form>
  );
}
