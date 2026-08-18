'use client';

import type { AiJobSummary, OverviewSummary } from '@foundry/api-contracts';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { topWaitingFounderTask } from '../../lib/founder-task-priority';
import { journeyPhaseCount, journeyStep, journeyStepIndex } from '../../lib/journey';
import { projectPanelHref } from '../../lib/project-href';
import { useTRPC } from '../../lib/trpc/client';
import { InterviewCapture } from '../evidence/interview-capture';
import { EmptyState } from '../ui/empty-state';
import { FounderTaskDetail } from '../work/founder-task-card';

type PrimaryAction = {
  title: string;
  detail?: string;
  href?: string;
  actionLabel?: string;
  /** When set, the main window renders the task's own action UI instead of a link-out. */
  founderTaskId?: string;
};

/**
 * Collapses everything that could plausibly be "what should I do right now"
 * into a single, ranked answer instead of a grid of equally-weighted cards.
 * Approving/reviewing something the AI already produced outranks starting
 * new work, which outranks founder legwork, which outranks passive status.
 */
function primaryActionOf(
  projectId: string,
  overview: OverviewSummary,
  fallback: string,
  topTaskId: string | undefined,
): PrimaryAction {
  if (overview.revisionPendingReview) {
    return {
      title: 'Review the draft plan your co-founder wrote',
      detail: 'A revision is ready. It will not replace the live plan until you approve it.',
      href: projectPanelHref(projectId, 'plan'),
      actionLabel: 'Review the draft',
    };
  }
  if (overview.proposedResearchJob !== null) {
    return {
      title: overview.proposedResearchJob.objective,
      detail: 'Research is proposed and waiting for your go-ahead before it starts.',
      href: projectPanelHref(projectId, 'work', { job: overview.proposedResearchJob.id }),
      actionLabel: 'Review and start',
    };
  }
  if (overview.waitingFounderTasks > 0 && topTaskId !== undefined) {
    return {
      title:
        overview.waitingFounderTasks === 1
          ? 'This needs something only you can do'
          : `This needs you — ${String(overview.waitingFounderTasks)} tasks are waiting`,
      detail: 'The AI cannot do this one for you. Resolve it below, right where it came up.',
      founderTaskId: topTaskId,
    };
  }
  if (overview.runningAiWork.length > 0) {
    const first = overview.runningAiWork[0] as AiJobSummary;
    return {
      title: `Your co-founder is working on it: ${first.objective}`,
      detail:
        overview.runningAiWork.length > 1
          ? `${String(overview.runningAiWork.length)} jobs running right now.`
          : 'No action needed — check back or keep chatting while this runs.',
      href: projectPanelHref(projectId, 'work'),
      actionLabel: 'Watch progress',
    };
  }
  return { title: fallback };
}

export function PhaseFocus({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const desk = useQuery(trpc.project.getDeskSummary.queryOptions({ projectId }));
  const score = useQuery(trpc.score.getCurrent.queryOptions({ projectId }));
  const tasks = useQuery(trpc.founderTask.list.queryOptions({ projectId }));

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
  const nextAction = score.data?.topActions[0]?.action ?? desk.data.nextAction;
  const wtpReason = (score.data?.reasons ?? []).find(
    (item) => item.dimension === 'willingness_to_pay',
  );
  const topTask = topWaitingFounderTask(tasks.data ?? []);
  const primary = primaryActionOf(projectId, overview, nextAction, topTask?.id);
  const hasSupportingContext =
    overview.topAssumptions.length > 0 || overview.runningAiWork.length > 0;

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
        <p className="callout-eyebrow">What to do next</p>
        <p className="callout-title">{primary.title}</p>
        {primary.detail === undefined ? null : (
          <p className="text-sm text-text-muted">{primary.detail}</p>
        )}
        {primary.href === undefined ? null : (
          <Link href={primary.href} className="btn mt-1 w-fit">
            {primary.actionLabel ?? 'Open'}
          </Link>
        )}
      </section>

      {primary.founderTaskId === undefined ? null : (
        <FounderTaskDetail projectId={projectId} founderTaskId={primary.founderTaskId} />
      )}

      {phase === 'evidence' ? (
        <section className="stack-tight">
          <div className="flex items-center justify-between gap-2">
            <h2 className="card-title">Log an interview</h2>
            <span className="hint">
              {String(desk.data.gateA.qualifyingInterviews)} of{' '}
              {String(desk.data.gateA.requiredInterviews)} independent interviews so far
            </span>
          </div>
          <InterviewCapture projectId={projectId} />
        </section>
      ) : null}

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

      {hasSupportingContext ? (
        <section className="stack-tight">
          <h2 className="hint font-medium tracking-wide uppercase">What we know</h2>
          {overview.topAssumptions.length === 0 ? null : (
            <ul className="flex flex-col gap-1.5">
              {overview.topAssumptions.slice(0, 3).map((item) => (
                <li key={item} className="text-sm text-text-muted">
                  {item}
                </li>
              ))}
            </ul>
          )}
          {overview.runningAiWork.length === 0 || overview.waitingFounderTasks > 0 ? null : (
            <ul className="flex flex-col gap-1.5">
              {overview.runningAiWork.slice(0, 3).map((job) => (
                <li key={job.id} className="text-sm text-text-muted">
                  Running: {job.objective}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
