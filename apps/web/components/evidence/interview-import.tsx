'use client';

import { InterviewParticipantTypes, type InterviewParticipantType } from '@foundry/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import { projectEvidenceHref } from '../../lib/project-href';
import { useTRPC } from '../../lib/trpc/client';

export function InterviewImportPanel({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const batches = useQuery(trpc.evidence.listInterviewImports.queryOptions({ projectId }));
  const start = useMutation(trpc.evidence.startInterviewImport.mutationOptions());
  const review = useMutation(trpc.evidence.reviewInterviewImportCandidate.mutationOptions());
  const decide = useMutation(trpc.evidence.decideInterviewImport.mutationOptions());
  const [text, setText] = useState('');
  const [batchId, setBatchId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const detail = useQuery({
    ...trpc.evidence.getInterviewImport.queryOptions({
      projectId,
      batchId: batchId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: batchId !== null,
  });

  async function onExtract(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const pasted = text.trim();
    if (pasted.length === 0) {
      return;
    }
    const created = await start.mutateAsync({
      projectId,
      text: pasted,
      idempotencyKey: crypto.randomUUID(),
    });
    setBatchId(created.batch.id);
    setSelected(Object.fromEntries(created.candidates.map((item) => [item.id, true])));
    await queryClient.invalidateQueries({
      queryKey: trpc.evidence.listInterviewImports.queryKey(),
    });
  }

  async function onDecide(accept: boolean): Promise<void> {
    if (batchId === null || detail.data === undefined) {
      return;
    }
    const ids = detail.data.candidates
      .filter((item) => selected[item.id] !== false)
      .map((item) => item.id);
    await decide.mutateAsync({
      projectId,
      batchId,
      acceptIds: accept ? ids : [],
      rejectIds: accept ? [] : ids,
      idempotencyKey: crypto.randomUUID(),
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.evidence.getInterviewImport.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.evidence.listInterviews.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.evidence.listLibrary.queryKey() }),
    ]);
  }

  const candidates = detail.data?.candidates ?? [];

  return (
    <section className="panel stack" aria-labelledby="interview-import-title">
      <div>
        <h2 className="card-title" id="interview-import-title">
          Import interview notes
        </h2>
        <p className="hint">
          Paste a file or notes with more than one interview. Nothing becomes an Interview until you
          accept a candidate. Consent stays unconfirmed unless you attest it.
        </p>
      </div>
      <form className="stack" onSubmit={(event) => void onExtract(event)}>
        <label className="field">
          <span>Notes to extract</span>
          <textarea
            className="textarea"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={
              'Interview 1\n> We lose two hours closing the books.\n---\nInterview 2\n> I would not pay for this.'
            }
          />
        </label>
        <button
          className="btn min-h-11"
          type="submit"
          disabled={start.isPending || text.trim().length === 0}
        >
          {start.isPending ? 'Extracting…' : 'Extract candidates'}
        </button>
      </form>
      {errorMessageOf(start.error) === null ? null : (
        <p className="alert">{errorMessageOf(start.error)}</p>
      )}
      {(batches.data ?? []).length === 0 ? null : (
        <ul className="list">
          {(batches.data ?? []).map((batch) => (
            <li key={batch.id} className="list-row">
              <button type="button" className="btn min-h-11" onClick={() => setBatchId(batch.id)}>
                Review {batch.classification.replaceAll('_', ' ')}
              </button>
              <span className="badge">{batch.status}</span>
            </li>
          ))}
        </ul>
      )}
      {candidates.length === 0 ? null : (
        <div className="stack">
          <p className="hint">
            {detail.data?.batch.classification.replaceAll('_', ' ')}. Select candidates, attest
            consent if you have it, then accept or reject. A source can stay in Evidence without
            becoming interviews.
          </p>
          {candidates.map((candidate) => (
            <article key={candidate.id} className="panel stack-tight">
              <label className="field flex-row items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected[candidate.id] !== false}
                  onChange={(event) =>
                    setSelected((current) => ({ ...current, [candidate.id]: event.target.checked }))
                  }
                />
                <span>{candidate.label}</span>
              </label>
              <p className="muted">{candidate.excerpt}</p>
              {candidate.warnings.map((warning) => (
                <p key={warning} className="hint">
                  {warning}
                </p>
              ))}
              <label className="field">
                <span>Participant type</span>
                <select
                  className="input"
                  value={candidate.participantType}
                  onChange={(event) => {
                    void review
                      .mutateAsync({
                        projectId,
                        candidateId: candidate.id,
                        participantType: event.target.value as InterviewParticipantType,
                        idempotencyKey: crypto.randomUUID(),
                      })
                      .then(() =>
                        queryClient.invalidateQueries({
                          queryKey: trpc.evidence.getInterviewImport.queryKey(),
                        }),
                      );
                  }}
                >
                  {InterviewParticipantTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field flex-row items-center gap-2">
                <input
                  type="checkbox"
                  checked={candidate.consentGiven}
                  onChange={(event) => {
                    void review
                      .mutateAsync({
                        projectId,
                        candidateId: candidate.id,
                        consentGiven: event.target.checked,
                        idempotencyKey: crypto.randomUUID(),
                      })
                      .then(() =>
                        queryClient.invalidateQueries({
                          queryKey: trpc.evidence.getInterviewImport.queryKey(),
                        }),
                      );
                  }}
                />
                <span>I attest this participant consented</span>
              </label>
              <p className="hint">Status: {candidate.status.replaceAll('_', ' ')}</p>
            </article>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              className="btn min-h-11"
              type="button"
              disabled={decide.isPending}
              onClick={() => void onDecide(true)}
            >
              Accept selected
            </button>
            <button
              className="btn min-h-11"
              type="button"
              disabled={decide.isPending}
              onClick={() => void onDecide(false)}
            >
              Reject selected
            </button>
            <a className="min-h-11 inline-flex items-center" href={projectEvidenceHref(projectId)}>
              Keep as source only
            </a>
          </div>
          {decide.data === undefined ? null : (
            <p className="hint">
              Created {String(decide.data.created)}, rejected {String(decide.data.rejected)},
              duplicates {String(decide.data.duplicates)}.
            </p>
          )}
          {errorMessageOf(decide.error) === null ? null : (
            <p className="alert">{errorMessageOf(decide.error)}</p>
          )}
        </div>
      )}
    </section>
  );
}
