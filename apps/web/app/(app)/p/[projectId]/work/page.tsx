import { redirect } from 'next/navigation';

export default async function WorkRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ view?: string; job?: string; task?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const paramsOut = new URLSearchParams({ panel: 'work' });
  if (query.view !== undefined) paramsOut.set('view', query.view);
  if (query.job !== undefined) paramsOut.set('job', query.job);
  if (query.task !== undefined) paramsOut.set('task', query.task);
  redirect(`/p/${projectId}?${paramsOut.toString()}`);
}
