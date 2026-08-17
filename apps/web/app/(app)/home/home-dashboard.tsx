'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';

import { Page } from '../../../components/chrome/app-shell';
import { EmptyState } from '../../../components/ui/empty-state';
import { useTRPC } from '../../../lib/trpc/client';

export function HomeDashboard() {
  const trpc = useTRPC();
  const workspaces = useQuery(trpc.workspace.list.queryOptions());
  const createWorkspace = useMutation(trpc.workspace.create.mutationOptions());
  const idempotencyKey = useRef(crypto.randomUUID());
  const [name, setName] = useState('My workspace');

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    try {
      await createWorkspace.mutateAsync({
        name,
        idempotencyKey: idempotencyKey.current,
      });
      idempotencyKey.current = crypto.randomUUID();
      await workspaces.refetch();
    } catch {
      // Keep the same idempotency key so a retry is safe.
    }
  }

  const items = workspaces.data ?? [];

  return (
    <Page>
      <div className="stack">
        <header>
          <h1 className="page-title">Welcome to Foundry</h1>
          <p className="lede">
            Foundry is an AI co-founder that helps you turn a rough idea into a real, validated
            business — one guided step at a time. Start by naming a workspace below; most people
            only ever need one.
          </p>
        </header>
        <div className="card stack">
          <div>
            <h2 className="card-title">Create a workspace</h2>
            <p className="hint">
              A workspace is the home for your ideas. You can create multiple projects inside it
              later.
            </p>
          </div>
          <form className="row-form" onSubmit={(event) => void onSubmit(event)}>
            <label className="field">
              <span>Name</span>
              <input
                className="input"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <button className="btn" type="submit" disabled={createWorkspace.isPending}>
              {createWorkspace.isPending ? 'Creating…' : 'Create workspace'}
            </button>
          </form>
          {createWorkspace.error === null ? null : (
            <p className="alert">
              {createWorkspace.error instanceof Error
                ? createWorkspace.error.message
                : 'Could not create workspace.'}
            </p>
          )}
        </div>
        {workspaces.error === null ? null : (
          <p className="alert">
            {workspaces.error instanceof Error
              ? workspaces.error.message
              : 'Could not load workspaces.'}
          </p>
        )}
        {workspaces.isLoading ? <p className="muted">Loading…</p> : null}
        {!workspaces.isLoading && workspaces.error === null && items.length === 0 ? (
          <EmptyState
            title="No workspaces yet"
            description="Create one above to get started — it takes a few seconds."
          />
        ) : (
          <ul className="list">
            {items.map((workspace) => (
              <li key={workspace.id} className="list-row">
                <Link href={`/w/${workspace.id}`} className="text-sm no-underline hover:underline">
                  {workspace.name}
                </Link>
                <span className="nav-link" aria-hidden="true">
                  Open →
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Page>
  );
}
