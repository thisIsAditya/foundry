import { JobBoardViewSchema } from '@foundry/api-contracts';

import { WorkBoard, WorkViewTabs } from '../../../../../components/work/work-board';

export default async function WorkPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ view?: string; job?: string; task?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const parsed = JobBoardViewSchema.safeParse(query.view ?? 'kanban');
  const view = parsed.success ? parsed.data : 'kanban';
  return (
    <div className="stack">
      <header>
        <h1 className="page-title">Work board</h1>
        <p className="lede">
          AI jobs and founder tasks in one place. Nothing outside the product starts without your
          approval.
        </p>
      </header>
      <WorkViewTabs projectId={projectId} current={view} />
      <WorkBoard
        projectId={projectId}
        view={view}
        {...(query.job === undefined ? {} : { selectedJobId: query.job })}
        {...(query.task === undefined ? {} : { selectedTaskId: query.task })}
      />
    </div>
  );
}
