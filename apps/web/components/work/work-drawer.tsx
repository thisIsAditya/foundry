'use client';

import { JobBoardViewSchema } from '@foundry/api-contracts';

import { WorkBoard, WorkViewTabs } from './work-board';

export function WorkDrawer({
  projectId,
  view,
  job,
  task,
}: {
  projectId: string;
  view: string | null;
  job: string | null;
  task: string | null;
}) {
  const parsed = JobBoardViewSchema.safeParse(view ?? 'kanban');
  const current = parsed.success ? parsed.data : 'kanban';
  return (
    <div className="stack">
      <header>
        <h1 className="page-title">Work board</h1>
        <p className="lede">
          AI jobs and founder tasks in one place. Nothing outside the product starts without your
          approval.
        </p>
      </header>
      <WorkViewTabs projectId={projectId} current={current} />
      <WorkBoard
        projectId={projectId}
        view={current}
        {...(job === null ? {} : { selectedJobId: job })}
        {...(task === null ? {} : { selectedTaskId: task })}
      />
    </div>
  );
}
