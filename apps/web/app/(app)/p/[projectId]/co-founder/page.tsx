import { redirect } from 'next/navigation';

import { projectHref } from '../../../../../lib/project-href';

export default async function CofounderPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(projectHref(projectId));
}
