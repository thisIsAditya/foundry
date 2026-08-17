import { toProductJobStatus, type Sprint, type SprintStatus } from '@foundry/domain';

import { AiJobSummarySchema, type AiJobSummary } from './ai-job-summary.js';

const PROGRESS_BY_STATUS: Record<SprintStatus, number> = {
  draft: 5,
  proposed: 8,
  contracted: 12,
  queued: 12,
  running: 55,
  paused: 40,
  stalled: 40,
  needs_founder: 70,
  needs_approval: 80,
  closed: 100,
  complete: 100,
  blocked: 30,
  failed: 30,
  canceled: 100,
  expired: 100,
};

function founderActionFor(status: SprintStatus): string | undefined {
  switch (status) {
    case 'draft':
    case 'proposed':
      return 'Review this plan before it starts.';
    case 'needs_founder':
    case 'paused':
    case 'stalled':
      return 'The co-founder is waiting on you.';
    case 'needs_approval':
      return 'Approve or reject the draft action.';
    default:
      return undefined;
  }
}

export function toAiJobSummary(input: {
  sprint: Sprint;
  citationCount?: number;
  changedSectionKeys?: string[];
}): AiJobSummary {
  const productStatus = toProductJobStatus(input.sprint.status);
  const action = founderActionFor(input.sprint.status);
  return AiJobSummarySchema.parse({
    id: input.sprint.id,
    objective: input.sprint.contract.objective,
    ...(input.sprint.contract.whyNow === undefined ? {} : { whyNow: input.sprint.contract.whyNow }),
    ...(input.sprint.contract.roleLabel === undefined
      ? {}
      : { roleLabel: input.sprint.contract.roleLabel }),
    owner: input.sprint.owner,
    status: productStatus,
    jobKind: input.sprint.jobKind,
    sourceAndScope: {
      sectionKeys: input.changedSectionKeys ?? [],
    },
    estimatedCost: input.sprint.contract.budget,
    citationCount: input.citationCount ?? 0,
    changedSectionKeys: input.changedSectionKeys ?? [],
    ...(action === undefined ? {} : { founderActionRequired: action }),
    progressPercent: PROGRESS_BY_STATUS[input.sprint.status],
  });
}
