'use client';

import { WorkBoard } from './work-board';

export function WorkDrawer({
  projectId,
  job,
  task,
}: {
  projectId: string;
  job: string | null;
  task: string | null;
}) {
  return (
    <div className="stack">
      <header>
        <h1 className="page-title">To-do</h1>
        <p className="lede">
          What needs you, what the AI is working on, and what's done. Nothing outside the product
          starts without your approval.
        </p>
      </header>
      <WorkBoard
        projectId={projectId}
        {...(job === null ? {} : { selectedJobId: job })}
        {...(task === null ? {} : { selectedTaskId: task })}
      />
    </div>
  );
}
