'use client';

import type { AiJobSummary } from '@foundry/api-contracts';
import { Gauge, productJobStatusPresentation } from '@foundry/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import { useTRPC } from '../../lib/trpc/client';

function formatCost(job: AiJobSummary): string {
  const estimated = job.estimatedCost;
  const actual = job.actualCost;
  if (actual !== undefined) {
    return `Spent ${actual.inputEstimate} in / ${actual.outputEstimate} out ${actual.currency}`;
  }
  if (estimated !== undefined) {
    return `Est. ${estimated.inputEstimate} in / ${estimated.outputEstimate} out ${estimated.currency}`;
  }
  return 'Cost unknown';
}

export function JobCard({
  job,
  selected = false,
  onSelect,
}: {
  projectId: string;
  job: AiJobSummary;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const presentation = productJobStatusPresentation(job.status);
  return (
    <button
      type="button"
      className={selected ? 'card-accent stack text-left' : 'card stack text-left'}
      onClick={onSelect}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge">
          <span aria-hidden="true">{presentation.icon}</span>
          {presentation.label}
        </span>
        <span className="badge">{job.jobKind}</span>
        <span className="muted">{job.owner.replaceAll('_', ' ')}</span>
      </div>
      <p className="card-title">{job.objective}</p>
      {job.whyNow === undefined ? null : <p className="hint">{job.whyNow}</p>}
      <p className="muted">
        {job.roleLabel ?? 'Co-founder job'} · {formatCost(job)} · {job.citationCount} citations
      </p>
      <Gauge
        value={job.progressPercent}
        size="sm"
        colorToken="statusInfo"
        label={`Progress ${String(job.progressPercent)} percent`}
      />
      {job.founderActionRequired === undefined ? null : (
        <p className="text-sm">{job.founderActionRequired}</p>
      )}
      {job.changedSectionKeys.length === 0 ? null : (
        <p className="hint">Touches {job.changedSectionKeys.join(', ')}</p>
      )}
    </button>
  );
}

export function JobDetail({ projectId, jobId }: { projectId: string; jobId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const job = useQuery(trpc.job.get.queryOptions({ projectId, jobId }));
  const contract = useQuery(trpc.sprint.getContract.queryOptions({ sprintId: jobId }));
  const approveKey = useRef(crypto.randomUUID());
  const pauseKey = useRef(crypto.randomUUID());
  const retryKey = useRef(crypto.randomUUID());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const approve = useMutation(
    trpc.sprint.approvePlan.mutationOptions({
      onSuccess: async () => {
        approveKey.current = crypto.randomUUID();
        await queryClient.invalidateQueries({ queryKey: trpc.job.list.queryKey() });
      },
    }),
  );
  const pause = useMutation(trpc.sprint.pause.mutationOptions());
  const resume = useMutation(trpc.sprint.resume.mutationOptions());
  const stop = useMutation(trpc.sprint.stop.mutationOptions());
  const retry = useMutation(trpc.job.retry.mutationOptions());

  if (job.isLoading) {
    return <p className="muted">Loading job…</p>;
  }
  if (job.isError) {
    return <p className="alert">{job.error.message}</p>;
  }
  if (job.data === undefined) {
    return <p className="muted">Job not found.</p>;
  }
  const summary = job.data;
  const hash = contract.data === undefined ? null : contract.data.contractHash;

  return (
    <div className="card stack">
      <JobCard projectId={projectId} job={summary} selected />
      <div className="flex flex-wrap gap-2">
        {summary.status === 'proposed' && hash !== null ? (
          <button
            className="btn"
            type="button"
            disabled={approve.isPending}
            onClick={() =>
              void approve.mutateAsync({
                sprintId: jobId,
                expectedContractHash: hash,
                idempotencyKey: approveKey.current,
              })
            }
          >
            {approve.isPending ? 'Starting…' : 'Start'}
          </button>
        ) : null}
        {summary.status === 'running' ? (
          <button
            className="btn-secondary"
            type="button"
            onClick={() =>
              void pause.mutateAsync({ sprintId: jobId, idempotencyKey: pauseKey.current })
            }
          >
            Pause
          </button>
        ) : null}
        {summary.status === 'queued' || summary.status === 'blocked' ? (
          <button
            className="btn-secondary"
            type="button"
            onClick={() =>
              void resume.mutateAsync({ sprintId: jobId, idempotencyKey: crypto.randomUUID() })
            }
          >
            Resume
          </button>
        ) : null}
        {summary.status === 'failed' ? (
          <button
            className="btn"
            type="button"
            onClick={() =>
              void retry.mutateAsync({
                projectId,
                jobId,
                idempotencyKey: retryKey.current,
              })
            }
          >
            Retry
          </button>
        ) : null}
        <button
          className="btn-secondary"
          type="button"
          onClick={() =>
            void stop.mutateAsync({ sprintId: jobId, idempotencyKey: crypto.randomUUID() })
          }
        >
          Cancel
        </button>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
        >
          Advanced settings
        </button>
      </div>
      {errorMessageOf(approve.error) === null ? null : (
        <p className="alert">{errorMessageOf(approve.error)}</p>
      )}
      {settingsOpen ? <JobSettingsPanel projectId={projectId} jobId={jobId} /> : null}
    </div>
  );
}

function JobSettingsPanel({ projectId, jobId }: { projectId: string; jobId: string }) {
  const trpc = useTRPC();
  const desk = useQuery(trpc.project.getDeskSummary.queryOptions({ projectId }));
  const contract = useQuery(trpc.sprint.getContract.queryOptions({ sprintId: jobId }));
  const workspaceId = desk.data?.project.workspaceId;
  const connections = useQuery({
    ...trpc.provider.listConnections.queryOptions({
      workspaceId: workspaceId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: workspaceId !== undefined,
  });
  const mutation = useMutation(trpc.job.updateSettings.mutationOptions());
  const [whyNow, setWhyNow] = useStateLocal(contract.data?.sprint.contract.whyNow ?? '');
  const [maxWorkers, setMaxWorkers] = useStateLocal(
    String(contract.data?.sprint.contract.maxWorkers ?? 1),
  );

  if (contract.data === undefined) {
    return <p className="muted">Loading settings…</p>;
  }
  const expectedVersion = contract.data.contractHash;
  const healthy = (connections.data ?? []).find((item) => item.healthStatus === 'ok');

  return (
    <form
      className="panel stack"
      onSubmit={(event) => {
        event.preventDefault();
        void mutation.mutateAsync({
          projectId,
          jobId,
          expectedVersion,
          patch: {
            whyNow: whyNow.trim().length > 0 ? whyNow.trim() : undefined,
            maxWorkers: Number(maxWorkers),
          },
          idempotencyKey: crypto.randomUUID(),
        });
      }}
    >
      <p className="hint">
        Safe overrides only. Policy, evidence rules, approvals, and budget ceilings still apply.
      </p>
      <label className="field">
        <span>Why this job matters</span>
        <input
          className="input"
          value={whyNow}
          onChange={(event) => setWhyNow(event.target.value)}
        />
      </label>
      <label className="field">
        <span>Worker count</span>
        <input
          className="input"
          type="number"
          min={1}
          max={5}
          value={maxWorkers}
          onChange={(event) => setMaxWorkers(event.target.value)}
        />
      </label>
      <p className="muted">
        {healthy === undefined
          ? 'No healthy provider connection. Add one in Settings.'
          : `${healthy.providerFamily} · ${healthy.authMode}. Tools stay inside the allowlist.`}
      </p>
      <button className="btn" type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving…' : 'Save settings'}
      </button>
      {errorMessageOf(mutation.error) === null ? null : (
        <p className="alert">{errorMessageOf(mutation.error)}</p>
      )}
    </form>
  );
}

function useStateLocal(initial: string): [string, (value: string) => void] {
  const [value, setValue] = useState(initial);
  return [value, setValue];
}
