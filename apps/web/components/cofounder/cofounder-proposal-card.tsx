'use client';

import Link from 'next/link';

import { projectDecisionsHref } from '../../lib/project-href';

export function CofounderProposalCard({
  projectId,
  proposalId,
}: {
  projectId: string;
  proposalId: string;
}) {
  return (
    <p>
      <Link
        className="btn min-h-11 inline-flex items-center"
        href={projectDecisionsHref(projectId, proposalId)}
      >
        Review the proposed change
      </Link>
    </p>
  );
}
