import { PackSectionKeyToBusinessModelSectionKey, PackSectionKeys } from '@foundry/domain';
import { redirect } from 'next/navigation';

export default async function PackSectionRedirect({
  params,
}: {
  params: Promise<{ projectId: string; section: string }>;
}) {
  const { projectId, section } = await params;
  const mapped = PackSectionKeys.includes(section as (typeof PackSectionKeys)[number])
    ? PackSectionKeyToBusinessModelSectionKey[section as (typeof PackSectionKeys)[number]]
    : section;
  redirect(`/p/${projectId}/plan/${mapped}`);
}
