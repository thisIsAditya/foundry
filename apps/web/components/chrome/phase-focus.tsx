'use client';

import type { OverviewSummary } from '@foundry/api-contracts';
import type { JourneyPhase } from '@foundry/domain';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { journeyPhaseCount, journeyStep, journeyStepIndex } from '../../lib/journey';
import { projectPanelHref } from '../../lib/project-href';
import { useTRPC } from '../../lib/trpc/client';
import { EmptyState } from '../ui/empty-state';

export const phaseFocusFields = {
  diagnose: ['topAssumptions', 'proposedResearchJob'],
  problem: ['topAssumptions', 'proposedResearchJob'],
  evidence: ['waitingFounderTasks'],
  market_and_competition: ['proposedResearchJob', 'runningAiWork'],
  model_and_pricing: ['topAssumptions', 'revisionPendingReview'],
  willingness_to_pay: ['topAssumptions'],
  product: ['revisionPendingReview', 'waitingFounderTasks'],
  build_and_launch: ['runningAiWork', 'waitingFounderTasks'],
  operate: ['runningAiWork', 'revisionPendingReview'],
} as const satisfies Record<JourneyPhase, readonly (keyof OverviewSummary)[]>;

export function PhaseFocus({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const desk = useQuery(trpc.project.getDeskSummary.queryOptions({ projectId }));
  const score = useQuery(trpc.score.getCurrent.queryOptions({ projectId }));

  if (desk.isLoading) {
    return <p className="muted">Loading this phase…</p>;
  }
  if (desk.isError) {
    return <p className="alert">{desk.error.message} Refresh to try again.</p>;
  }
  if (desk.data === undefined) {
    return (
      <EmptyState
        title="Venture not ready"
        description="Create the venture again if this keeps happening."
      />
    );
  }

  const phase = desk.data.derivedPhase;
  const step = journeyStep(phase);
  const index = journeyStepIndex(phase) + 1;
  const overview = desk.data.overview;
  const fields = phaseFocusFields[phase];
  const nextAction = score.data?.topActions[0]?.action ?? desk.data.nextAction;
  const wtpReason = (score.data?.reasons ?? []).find(
    (item) => item.dimension === 'willingness_to_pay',
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="font-display text-xs font-semibold tracking-wide text-text-muted uppercase">
          Phase {String(index)} of {String(journeyPhaseCount)} · {step.title}
        </p>
        <h1 className="page-title">{step.title}</h1>
        <p className="lede">{step.description}</p>
      </header>

      <section className="callout">
        <p className="callout-eyebrow">Recommended next action</p>
        <p className="callout-title">{nextAction}</p>
      </section>

      {fields.map((field) => (
        <PhaseField key={field} field={field} projectId={projectId} overview={overview} />
      ))}

      {phase === 'willingness_to_pay' ? (
        <section className="card stack">
          <h2 className="card-title">Willingness to pay</h2>
          {wtpReason === undefined ? (
            <p className="hint">
              No WTP score reason yet. Interviews and paid signals fill this in.
            </p>
          ) : (
            <p className="text-sm">{wtpReason.message}</p>
          )}
        </section>
      ) : null}

      {phase === 'evidence' ? (
        <section className="card stack">
          <h2 className="card-title">Interviews so far</h2>
          <p className="text-sm">
            {desk.data.interviewCount === 0
              ? 'No interviews recorded yet.'
              : `${String(desk.data.interviewCount)} interview${desk.data.interviewCount === 1 ? '' : 's'} captured.`}
          </p>
          <Link href={projectPanelHref(projectId, 'research')} className="text-sm">
            Open research
          </Link>
        </section>
      ) : null}
    </div>
  );
}

function PhaseField({
  field,
  projectId,
  overview,
}: {
  field: keyof OverviewSummary;
  projectId: string;
  overview: OverviewSummary;
}) {
  switch (field) {
    case 'topAssumptions':
      return (
        <section className="card stack">
          <h2 className="card-title">Top assumptions</h2>
          {overview.topAssumptions.length === 0 ? (
            <p className="hint">No open assumptions on this phase yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {overview.topAssumptions.slice(0, 3).map((item) => (
                <li key={item} className="text-sm">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </section>
      );
    case 'proposedResearchJob':
      return (
        <section className="card stack">
          <h2 className="card-title">Research waiting to start</h2>
          {overview.proposedResearchJob === null ? (
            <p className="hint">No research proposal waiting.</p>
          ) : (
            <>
              <p className="text-sm">{overview.proposedResearchJob.objective}</p>
              <Link
                href={projectPanelHref(projectId, 'work', {
                  job: overview.proposedResearchJob.id,
                })}
                className="text-sm"
              >
                Review before it starts
              </Link>
            </>
          )}
        </section>
      );
    case 'runningAiWork':
      return (
        <section className="card stack">
          <h2 className="card-title">AI work running</h2>
          {overview.runningAiWork.length === 0 ? (
            <p className="hint">Nothing running right now.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {overview.runningAiWork.map((job) => (
                <li key={job.id}>
                  <Link href={projectPanelHref(projectId, 'work', { job: job.id })}>
                    {job.objective}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      );
    case 'waitingFounderTasks':
      return (
        <section className="card stack">
          <h2 className="card-title">Waiting on you</h2>
          {overview.waitingFounderTasks === 0 ? (
            <p className="hint">No founder tasks waiting.</p>
          ) : (
            <>
              <p className="text-sm">
                {String(overview.waitingFounderTasks)} founder task
                {overview.waitingFounderTasks === 1 ? '' : 's'}.
              </p>
              <Link
                href={projectPanelHref(projectId, 'work', { view: 'needs_me' })}
                className="text-sm"
              >
                Open work
              </Link>
            </>
          )}
        </section>
      );
    case 'revisionPendingReview':
      return (
        <section className="card stack">
          <h2 className="card-title">Revision waiting for review</h2>
          {overview.revisionPendingReview ? (
            <Link href={projectPanelHref(projectId, 'plan')} className="text-sm">
              Review the draft plan
            </Link>
          ) : (
            <p className="hint">No draft revision pending.</p>
          )}
        </section>
      );
    default:
      return null;
  }
}
