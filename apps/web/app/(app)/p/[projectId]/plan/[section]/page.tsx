import { redirect } from 'next/navigation';

export default async function PlanSectionRedirect({
  params,
}: {
  params: Promise<{ projectId: string; section: string }>;
}) {
  const { projectId, section } = await params;
  redirect(`/p/${projectId}?panel=plan&section=${encodeURIComponent(section)}`);
}
