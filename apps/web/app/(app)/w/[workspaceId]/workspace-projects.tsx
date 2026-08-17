'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';

import { Page } from '../../../../components/chrome/app-shell';
import { EmptyState } from '../../../../components/ui/empty-state';
import { journeyStep } from '../../../../lib/journey';
import { useTRPC } from '../../../../lib/trpc/client';

export function WorkspaceProjects({ workspaceId }: { workspaceId: string }) {
  const trpc = useTRPC();
  const projects = useQuery(trpc.project.list.queryOptions({ workspaceId }));
  const createProject = useMutation(trpc.project.create.mutationOptions());
  const idempotencyKey = useRef(crypto.randomUUID());
  const [name, setName] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    try {
      await createProject.mutateAsync({
        workspaceId,
        name,
        idempotencyKey: idempotencyKey.current,
      });
      idempotencyKey.current = crypto.randomUUID();
      setName('');
      await projects.refetch();
    } catch {
      // Keep the same idempotency key so a retry is safe.
    }
  }

  const items = projects.data ?? [];

  return (
    <Page>
      <div className="stack">
        <header>
          <p className="lede mb-1">
            <Link href="/home">← All workspaces</Link>
            {' · '}
            <Link href={`/w/${workspaceId}/settings`}>Settings</Link>
          </p>
          <h1 className="page-title">Your projects</h1>
          <p className="lede">
            Each project is one business idea, from a rough hunch all the way to a running business.
            Give this one a name to start working on it.
          </p>
        </header>
        <div className="card stack">
          <div>
            <h2 className="card-title">Start a new idea</h2>
            <p className="hint">You can always rename or add more projects later.</p>
          </div>
          <form className="row-form" onSubmit={(event) => void onSubmit(event)}>
            <label className="field">
              <span>What&apos;s the idea called?</span>
              <input
                className="input"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Cafe scheduling app"
                required
              />
            </label>
            <button className="btn" type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? 'Creating…' : 'Start project'}
            </button>
          </form>
          {createProject.error === null ? null : (
            <p className="alert">
              {createProject.error instanceof Error
                ? createProject.error.message
                : 'Could not create project.'}
            </p>
          )}
        </div>
        {projects.isLoading ? <p className="muted">Loading…</p> : null}
        {!projects.isLoading && items.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Start one above — you'll land on the overview with a draft, score, and research proposal."
          />
        ) : (
          <ul className="list">
            {items.map((project) => (
              <li key={project.id} className="list-row">
                <Link href={`/p/${project.id}`} className="text-sm no-underline hover:underline">
                  {project.name}
                </Link>
                <span className="badge badge-info">{journeyStep(project.currentPhase).title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Page>
  );
}
