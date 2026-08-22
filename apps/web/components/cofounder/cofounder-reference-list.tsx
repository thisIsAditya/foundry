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
  const actionableReferences = uniqueReferences(projectId, references);
  if (actionableReferences.length === 0) {
    return null;
  }
  return (
    <ul className="cofounder-reference-list" aria-label="Linked business state">
      {actionableReferences.map((ref) => (
        <li key={`${ref.kind}-${ref.id}`}>
          <Link className="cofounder-action" href={hrefFor(projectId, ref)}>
            {labelFor(ref)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function uniqueReferences(
  projectId: string,
  references: readonly { kind: string; id: string }[],
): { kind: string; id: string }[] {
  const seenDestinations = new Set<string>();
  return references.filter((ref) => {
    const destination = hrefFor(projectId, ref);
    if (seenDestinations.has(destination)) {
      return false;
    }
    seenDestinations.add(destination);
    return true;
  });
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
