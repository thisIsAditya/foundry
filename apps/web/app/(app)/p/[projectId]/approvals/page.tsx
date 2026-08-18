import { redirect } from 'next/navigation';

export default async function ApprovalsRedirect({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/p/${projectId}?panel=work&view=blocked`);
}
