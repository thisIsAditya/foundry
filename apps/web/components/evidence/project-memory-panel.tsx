'use client';

import { ProjectMemoryKinds, type ProjectMemoryKind } from '@foundry/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import { useTRPC } from '../../lib/trpc/client';

export function ProjectMemoryPanel({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const memory = useQuery(trpc.evidence.listMemory.queryOptions({ projectId }));
  const upsert = useMutation(trpc.evidence.upsertMemory.mutationOptions());
  const remove = useMutation(trpc.evidence.deleteMemory.mutationOptions());
  const [kind, setKind] = useState<ProjectMemoryKind>('goal');
  const [body, setBody] = useState('');

  async function refresh(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: trpc.evidence.listMemory.queryKey() });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      return;
    }
    await upsert.mutateAsync({
      projectId,
      kind,
      body: trimmed,
      idempotencyKey: crypto.randomUUID(),
    });
    setBody('');
    await refresh();
  }

  return (
    <section className="panel stack" aria-labelledby="memory-title">
      <div>
        <h2 className="card-title" id="memory-title">
          Project memory
        </h2>
        <p className="hint">
          Compact summaries the co-founder may reuse. This is a derived aid, not the business
          record. You can correct or delete every item.
        </p>
      </div>
      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        <label className="field">
          <span>Kind</span>
          <select
            className="input"
            value={kind}
            onChange={(event) => setKind(event.target.value as ProjectMemoryKind)}
          >
            {ProjectMemoryKinds.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Summary</span>
          <textarea
            className="textarea"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
          />
        </label>
        <button className="btn min-h-11" type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? 'Saving…' : 'Save memory'}
        </button>
      </form>
      {errorMessageOf(upsert.error) === null ? null : (
        <p className="alert">{errorMessageOf(upsert.error)}</p>
      )}
      {(memory.data ?? []).length === 0 ? (
        <p className="hint">No memory entries yet.</p>
      ) : (
        <ul className="list">
          {(memory.data ?? []).map((entry) => (
            <li key={entry.id} className="list-row">
              <div>
                <p className="text-sm">{entry.body}</p>
                <p className="muted">
                  {entry.kind} · {entry.sourceKind}
                  {entry.stale ? ' · stale' : ''}
                </p>
              </div>
              <button
                type="button"
                className="btn min-h-11"
                disabled={remove.isPending}
                onClick={() => {
                  void remove
                    .mutateAsync({
                      projectId,
                      id: entry.id,
                      idempotencyKey: crypto.randomUUID(),
                    })
                    .then(() => refresh());
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
