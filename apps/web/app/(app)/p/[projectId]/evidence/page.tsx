import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EvidenceLibrary } from '../../../../../components/journey/evidence-library';
import { InterviewCapture } from '../../../../../components/evidence/interview-capture';

export const metadata: Metadata = { title: 'Evidence' };

export default async function EvidencePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { projectId } = await params;
  const query = await searchParams;
  if (projectId.length === 0) {
    notFound();
  }
  return (
    <article className="stack">
      <header>
        <h1 className="page-title">Evidence</h1>
        <p className="lede">
          Capture observations, interviews, sources, and assumptions. Notes are not proof until they
          support an accepted claim.
        </p>
      </header>
      <EvidenceLibrary
        projectId={projectId}
        {...(query.filter === undefined ? {} : { filter: query.filter })}
      />
      <InterviewCapture projectId={projectId} />
    </article>
  );
}
