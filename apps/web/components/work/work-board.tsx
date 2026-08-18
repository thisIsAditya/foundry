'use client';

import type { AiJobSummary, JobBoardView } from '@foundry/api-contracts';
import type { ProductJobStatus } from '@foundry/domain';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import { useTRPC } from '../../lib/trpc/client';
import { ApprovalsQueue } from './approvals-queue';
import { EmptyState } from '../ui/empty-state';

import { FounderTaskCard, FounderTaskDetail } from './founder-task-card';
import { JobCard, JobDetail } from './job-card';

const KANBAN_COLUMNS: ProductJobStatus[] = [
  'proposed',
  'queued',
  'running',
  'needs_founder',
  'needs_approval',
  'complete',
  'blocked',
];

const VIEW_LABELS: Record<JobBoardView, string> = {
  kanban: 'Kanban',
  mine: 'Assigned to me',
  timeline: 'Timeline',
  cost: 'Cost',
  completed: 'Completed',
  blocked: 'Blocked',
  needs_me: 'Needs me',
  running: 'Running',
  waiting_for_research: 'Waiting for research',
  needs_review: 'Needs review',
};

export function WorkBoard({
  projectId,
  view,
  selectedJobId,
  selectedTaskId,
}: {
  projectId: string;
  view: JobBoardView;
  selectedJobId?: string;
  selectedTaskId?: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const jobs = useQuery(trpc.job.list.queryOptions({ projectId, view }));
  const tasks = useQuery(trpc.founderTask.list.queryOptions({ projectId }));
  const [localError, setLocalError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const approve = useMutation(trpc.sprint.approvePlan.mutationOptions());
  const pause = useMutation(trpc.sprint.pause.mutationOptions());
  const retry = useMutation(trpc.job.retry.mutationOptions());

  const grouped = useMemo(() => {
    const map = new Map<ProductJobStatus, AiJobSummary[]>();
    for (const column of KANBAN_COLUMNS) {
      map.set(column, []);
    }
    for (const job of jobs.data ?? []) {
      const bucket = map.get(job.status) ?? [];
      bucket.push(job);
      map.set(job.status, bucket);
    }
    return map;
  }, [jobs.data]);

  async function onDragEnd(event: DragEndEvent): Promise<void> {
    const jobId = String(event.active.id);
    const over = event.over?.id;
    if (over === undefined) {
      return;
    }
    const target = String(over) as ProductJobStatus;
    const job = (jobs.data ?? []).find((item) => item.id === jobId);
    if (job === undefined || job.status === target) {
      return;
    }
    try {
      if (job.status === 'proposed' && (target === 'queued' || target === 'running')) {
        const contract = await queryClient.fetchQuery(
          trpc.sprint.getContract.queryOptions({ sprintId: jobId }),
        );
        await approve.mutateAsync({
          sprintId: jobId,
          expectedContractHash: contract.contractHash,
          idempotencyKey: crypto.randomUUID(),
        });
        return;
      }
      if (job.status === 'running' && target === 'needs_founder') {
        await pause.mutateAsync({ sprintId: jobId, idempotencyKey: crypto.randomUUID() });
        return;
      }
      if (job.status === 'failed' && target === 'queued') {
        await retry.mutateAsync({ projectId, jobId, idempotencyKey: crypto.randomUUID() });
        return;
      }
      setLocalError('That move is not allowed. Use Start, Pause, Retry, or Cancel on the job.');
    } catch (error) {
      setLocalError(errorMessageOf(error) ?? 'Could not move the job.');
    }
  }

  if (jobs.isLoading) {
    return <p className="muted">Loading the work board…</p>;
  }
  if (jobs.isError) {
    return <p className="alert">{jobs.error.message}</p>;
  }

  const selectedJob = selectedJobId ?? jobs.data?.[0]?.id;
  const selectedTask = selectedTaskId ?? tasks.data?.[0]?.id;

  return (
    <div className="stack">
      {localError === null ? null : <p className="alert">{localError}</p>}
      {view === 'kanban' ? (
        <DndContext sensors={sensors} onDragEnd={(event) => void onDragEnd(event)}>
          <div className="kanban">
            {KANBAN_COLUMNS.map((column) => (
              <KanbanColumn
                key={column}
                projectId={projectId}
                status={column}
                jobs={grouped.get(column) ?? []}
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <ul className="stack">
          {(jobs.data ?? []).map((job) => (
            <li key={job.id}>
              <JobCard projectId={projectId} job={job} selected={job.id === selectedJob} />
            </li>
          ))}
        </ul>
      )}
      {(jobs.data ?? []).length === 0 ? (
        <EmptyState
          title="No jobs in this view"
          description="The co-founder proposes research and draft jobs here. Nothing starts until you review it."
        />
      ) : null}
      {view === 'cost' ? <CostView jobs={jobs.data ?? []} /> : null}
      {view === 'blocked' ? <ApprovalsQueue projectId={projectId} /> : null}
      <section className="stack">
        <h2 className="card-title">Founder tasks</h2>
        {(tasks.data ?? []).length === 0 ? (
          <p className="hint">No founder tasks waiting.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(tasks.data ?? []).map((task) => (
              <FounderTaskCard key={task.id} task={task} selected={task.id === selectedTask} />
            ))}
          </div>
        )}
      </section>
      {selectedJob === undefined ? null : <JobDetail projectId={projectId} jobId={selectedJob} />}
      {selectedTask === undefined ? null : (
        <FounderTaskDetail projectId={projectId} founderTaskId={selectedTask} />
      )}
    </div>
  );
}

function KanbanColumn({
  projectId,
  status,
  jobs,
}: {
  projectId: string;
  status: ProductJobStatus;
  jobs: AiJobSummary[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={isOver ? 'kanban-col kanban-col-over' : 'kanban-col'}
      aria-label={status.replaceAll('_', ' ')}
    >
      <p className="hint capitalize">{status.replaceAll('_', ' ')}</p>
      <div className="stack" style={{ gap: '0.75rem' }}>
        {jobs.map((job) => (
          <DraggableJob key={job.id} projectId={projectId} job={job} />
        ))}
      </div>
    </section>
  );
}

function DraggableJob({ projectId, job }: { projectId: string; job: AiJobSummary }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: job.id });
  const style = transform
    ? { transform: `translate3d(${String(transform.x)}px, ${String(transform.y)}px, 0)` }
    : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <JobCard projectId={projectId} job={job} />
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

export function WorkViewTabs({ projectId, current }: { projectId: string; current: JobBoardView }) {
  const views: JobBoardView[] = ['kanban', 'mine', 'timeline', 'cost', 'completed', 'blocked'];
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Board views">
      {views.map((view) => (
        <a
          key={view}
          href={`/p/${projectId}/work?view=${view}`}
          className={view === current ? 'badge badge-info no-underline' : 'badge no-underline'}
          aria-current={view === current ? 'page' : undefined}
        >
          {VIEW_LABELS[view]}
        </a>
      ))}
    </nav>
  );
}
