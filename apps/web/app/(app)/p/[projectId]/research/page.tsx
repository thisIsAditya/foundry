import { redirect } from 'next/navigation';

export default async function ResearchRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  const paramsOut = new URLSearchParams({ panel: 'research' });
  if (query.filter !== undefined) paramsOut.set('filter', query.filter);
  redirect(`/p/${projectId}?${paramsOut.toString()}`);
}
