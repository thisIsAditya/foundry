'use client';

import type { AiJobSummary } from '@foundry/api-contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import { NEEDS_YOU_TASK_STATUSES, taskPriority } from '../../lib/founder-task-priority';
import { useTRPC } from '../../lib/trpc/client';
import { EmptyState } from '../ui/empty-state';
import { ApprovalsQueue } from './approvals-queue';
import { FounderTaskCard, FounderTaskDetail } from './founder-task-card';
import { JobCard, JobDetail } from './job-card';

const NEEDS_YOU_JOB_STATUSES = new Set([
  'proposed',
  'needs_founder',
  'needs_approval',
  'blocked',
  'failed',
]);
const IN_PROGRESS_JOB_STATUSES = new Set(['queued', 'running']);

function jobPriority(job: AiJobSummary): number {
  switch (job.status) {
    case 'needs_approval':
    case 'proposed':
      return 0;
    case 'blocked':
    case 'failed':
    case 'needs_founder':
      return 1;
    default:
      return 2;
  }
}

export function WorkBoard({
  projectId,
  selectedJobId,
  selectedTaskId,
}: {
  projectId: string;
  selectedJobId?: string;
  selectedTaskId?: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const jobs = useQuery(trpc.job.list.queryOptions({ projectId, view: 'kanban' }));
  const tasks = useQuery(trpc.founderTask.list.queryOptions({ projectId }));
  const [localError, setLocalError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [showCost, setShowCost] = useState(false);
  const approve = useMutation(trpc.sprint.approvePlan.mutationOptions());
  const retry = useMutation(trpc.job.retry.mutationOptions());

  const { needsYouJobs, needsYouTasks, inProgressJobs, doneJobs, doneTasks } = useMemo(() => {
    const allJobs = jobs.data ?? [];
    const allTasks = tasks.data ?? [];
    return {
      needsYouJobs: allJobs
        .filter((job) => NEEDS_YOU_JOB_STATUSES.has(job.status))
        .sort((a, b) => jobPriority(a) - jobPriority(b)),
      needsYouTasks: allTasks
        .filter((task) => NEEDS_YOU_TASK_STATUSES.has(task.status))
        .sort((a, b) => taskPriority(a) - taskPriority(b)),
      inProgressJobs: allJobs.filter((job) => IN_PROGRESS_JOB_STATUSES.has(job.status)),
      doneJobs: allJobs.filter((job) => job.status === 'complete' || job.status === 'canceled'),
      doneTasks: allTasks.filter(
        (task) => task.status === 'completed' || task.status === 'skipped',
      ),
    };
  }, [jobs.data, tasks.data]);

  async function onStartJob(job: AiJobSummary): Promise<void> {
    try {
      const contract = await queryClient.fetchQuery(
        trpc.sprint.getContract.queryOptions({ sprintId: job.id }),
      );
      await approve.mutateAsync({
        sprintId: job.id,
        expectedContractHash: contract.contractHash,
        idempotencyKey: crypto.randomUUID(),
      });
    } catch (error) {
      setLocalError(errorMessageOf(error) ?? 'Could not start that job.');
    }
  }

  async function onRetryJob(job: AiJobSummary): Promise<void> {
    try {
      await retry.mutateAsync({ projectId, jobId: job.id, idempotencyKey: crypto.randomUUID() });
    } catch (error) {
      setLocalError(errorMessageOf(error) ?? 'Could not retry that job.');
    }
  }

  if (jobs.isLoading) {
    return <p className="muted">Loading your to-do list…</p>;
  }
  if (jobs.isError) {
    return <p className="alert">{jobs.error.message}</p>;
  }

  const selectedJob = selectedJobId ?? needsYouJobs[0]?.id ?? inProgressJobs[0]?.id;
  const selectedTask = selectedTaskId ?? needsYouTasks[0]?.id;
  const doneCount = doneJobs.length + doneTasks.length;
  const allJobs = jobs.data ?? [];

  return (
    <div className="stack">
      {localError === null ? null : <p className="alert">{localError}</p>}
      <ApprovalsQueue projectId={projectId} />

      <section className="todo-section">
        <div className="todo-section-heading">
          <h2 className="card-title">Needs you</h2>
          {needsYouJobs.length + needsYouTasks.length === 0 ? null : (
            <span className="badge badge-warning">
              {needsYouJobs.length + needsYouTasks.length}
            </span>
          )}
        </div>
        {needsYouJobs.length === 0 && needsYouTasks.length === 0 ? (
          <EmptyState
            title="Nothing needs you right now"
            description="Your co-founder proposes research and drafts jobs here first. Nothing starts without your approval."
          />
        ) : (
          <div className="todo-list">
            {needsYouJobs.map((job) => (
              <JobCard
                key={job.id}
                projectId={projectId}
                job={job}
                selected={job.id === selectedJob}
                {...(job.status === 'proposed'
                  ? { onQuickAction: { label: 'Start', onClick: () => void onStartJob(job) } }
                  : {})}
                {...(job.status === 'failed'
                  ? { onQuickAction: { label: 'Retry', onClick: () => void onRetryJob(job) } }
                  : {})}
              />
            ))}
            {needsYouTasks.map((task) => (
              <FounderTaskCard key={task.id} task={task} selected={task.id === selectedTask} />
            ))}
          </div>
        )}
      </section>

      {inProgressJobs.length === 0 ? null : (
        <section className="todo-section">
          <h2 className="card-title">In progress</h2>
          <p className="hint">Visible for transparency only — nothing here needs your input yet.</p>
          <div className="todo-list">
            {inProgressJobs.map((job) => (
              <JobCard
                key={job.id}
                projectId={projectId}
                job={job}
                selected={job.id === selectedJob}
              />
            ))}
          </div>
        </section>
      )}

      {doneCount === 0 ? null : (
        <details
          className="todo-disclosure"
          open={showDone}
          onToggle={(event) => setShowDone(event.currentTarget.open)}
        >
          <summary>
            <span>Done</span>
            <span className="badge">{doneCount}</span>
          </summary>
          <div className="todo-disclosure-body">
            {doneJobs.map((job) => (
              <JobCard key={job.id} projectId={projectId} job={job} />
            ))}
            {doneTasks.map((task) => (
              <FounderTaskCard key={task.id} task={task} />
            ))}
          </div>
        </details>
      )}

      {allJobs.length === 0 ? null : (
        <details
          className="todo-disclosure"
          open={showCost}
          onToggle={(event) => setShowCost(event.currentTarget.open)}
        >
          <summary>
            <span>Cost so far</span>
          </summary>
          <div className="todo-disclosure-body">
            <CostView jobs={allJobs} />
          </div>
        </details>
      )}

      {selectedJob === undefined ? null : <JobDetail projectId={projectId} jobId={selectedJob} />}
      {selectedTask === undefined ? null : (
        <FounderTaskDetail projectId={projectId} founderTaskId={selectedTask} />
      )}
    </div>
  );
}

function CostView({ jobs }: { jobs: AiJobSummary[] }) {
  return (
    <ul className="list">
      {jobs.map((job) => (
        <li key={job.id} className="list-row">
          <span className="text-sm">{job.objective}</span>
          <span className="muted">
            {job.estimatedCost === undefined
              ? 'No estimate'
              : `${job.estimatedCost.inputEstimate} / ${job.estimatedCost.outputEstimate} ${job.estimatedCost.currency}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
