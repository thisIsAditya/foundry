'use client';

import type { RecordSectionDetail } from '@foundry/api-contracts';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import { useTRPC } from '../../lib/trpc/client';

export function RecordSectionEditor({
  projectId,
  detail,
  title = 'Edit this section',
  description = 'Saving creates an accepted record version. The co-founder cannot skip this step.',
}: {
  projectId: string;
  detail: RecordSectionDetail;
  title?: string;
  description?: string;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const save = useMutation(trpc.record.saveSection.mutationOptions());
  const [summary, setSummary] = useState(detail.item.content.summary);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = summary.trim();
    if (trimmed.length === 0) {
      return;
    }
    await save.mutateAsync({
      projectId,
      section: detail.section,
      expectedRevision: detail.item.revision,
      summary: trimmed,
      evidenceIds: detail.linkedEvidence.map((item) => item.id),
      idempotencyKey: crypto.randomUUID(),
    });
    router.refresh();
  }

  return (
    <form className="panel stack" onSubmit={(event) => void onSubmit(event)}>
      <h2 className="card-title">{title}</h2>
      <p className="hint">{description}</p>
      <label className="field">
        <span>{detail.item.status === 'empty' ? 'Your founder input' : 'Current summary'}</span>
        <textarea
          className="textarea"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          required
        />
      </label>
      {detail.linkedEvidence.length === 0 ? (
        <p className="hint">No linked evidence yet. Capture it on Evidence, then return here.</p>
      ) : (
        <ul className="hint">
          {detail.linkedEvidence.map((item) => (
            <li key={item.id}>{item.summary}</li>
          ))}
        </ul>
      )}
      {detail.linkedDecisions.length === 0 ? null : (
        <ul className="hint">
          {detail.linkedDecisions.map((item) => (
            <li key={item.id}>{item.statement}</li>
          ))}
        </ul>
      )}
      <button className="btn min-h-11" type="submit" disabled={save.isPending}>
        {save.isPending ? 'Saving…' : 'Save accepted version'}
      </button>
      {errorMessageOf(save.error) === null ? null : (
        <p className="alert">{errorMessageOf(save.error)}</p>
      )}
    </form>
  );
}
