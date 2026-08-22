'use client';

import Link from 'next/link';

import {
  projectDecisionsHref,
  projectEvidenceHref,
  projectJourneyHref,
  projectModelHref,
} from '../../lib/project-href';

export function CofounderReferenceList({
  projectId,
  references,
}: {
  projectId: string;
  references: readonly { kind: string; id: string }[];
}) {
  if (references.length === 0) {
    return null;
  }
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Linked business state">
      {references.map((ref) => (
        <li key={`${ref.kind}-${ref.id}`}>
          <Link
            className="badge no-underline min-h-11 inline-flex items-center"
            href={hrefFor(projectId, ref)}
          >
            {labelFor(ref)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function hrefFor(projectId: string, ref: { kind: string; id: string }): string {
  if (ref.kind === 'proposal' || ref.kind === 'decision') {
    return projectDecisionsHref(projectId, ref.kind === 'proposal' ? ref.id : undefined);
  }
  if (ref.kind === 'step') {
    return projectJourneyHref(projectId, ref.id);
  }
  if (ref.kind === 'record' || ref.kind === 'section') {
    return projectModelHref(projectId, ref.id);
  }
  if (ref.kind === 'evidence' || ref.kind === 'source') {
    return projectEvidenceHref(projectId);
  }
  return projectJourneyHref(projectId);
}

function labelFor(ref: { kind: string; id: string }): string {
  if (ref.kind === 'proposal') {
    return 'Open proposal';
  }
  if (ref.kind === 'decision') {
    return 'Open decision';
  }
  if (ref.kind === 'step') {
    return 'Open step';
  }
  if (ref.kind === 'record' || ref.kind === 'section') {
    return 'Open record';
  }
  if (ref.kind === 'evidence' || ref.kind === 'source') {
    return 'Open evidence';
  }
  return 'Open linked state';
}
