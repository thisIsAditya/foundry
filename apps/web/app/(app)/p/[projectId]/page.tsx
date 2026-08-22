import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { OverviewDesk } from '../../../../components/journey/overview-desk';
import { createServerApi } from '../../../../lib/trpc/server';

export const metadata: Metadata = { title: 'Overview' };

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  try {
    const api = await createServerApi();
    const [overview, map] = await Promise.all([
      api.journey.getOverview({ projectId }),
      api.journey.getMap({ projectId }),
    ]);
    return <OverviewDesk overview={overview} map={map} />;
  } catch {
    notFound();
  }
}
