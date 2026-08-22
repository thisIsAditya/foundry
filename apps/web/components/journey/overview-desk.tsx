import type { JourneyMap, JourneyOverview } from '@foundry/api-contracts';
import { JOURNEY_STAGE_DEFINITIONS, type ReadinessKind } from '@foundry/domain';
import Link from 'next/link';

import { formatMessageTimestamp } from '../../lib/format';
import {
  projectDecisionsHref,
  projectEvidenceHref,
  projectJourneyHref,
  projectModelHref,
} from '../../lib/project-href';

const READINESS_LABEL: Record<ReadinessKind, string> = {
  supported: 'Accepted',
  missing_evidence: 'Needs evidence',
  contradictory: 'Conflict',
  blocked: 'Blocked',
  stale: 'Stale',
  empty: 'Empty',
};

function humanize(value: string): string {
  return value.replaceAll('_', ' ');
}

function primaryAction(overview: JourneyOverview): {
  href: string;
  label: string;
} {
  const waiting = overview.pendingProposals[0];
  if (waiting !== undefined) {
    return {
      href: projectDecisionsHref(overview.projectId, waiting.id),
      label:
        overview.pendingProposals.length === 1
          ? 'Review the waiting proposal'
          : `Review ${String(overview.pendingProposals.length)} waiting proposals`,
    };
  }
  if (overview.recommendedStep !== null) {
    return {
      href: projectJourneyHref(overview.projectId, overview.recommendedStep.id),
      label: 'Start this step',
    };
  }
  return {
    href: projectJourneyHref(overview.projectId),
    label: 'Open the journey map',
  };
}

export function OverviewDesk({ overview, map }: { overview: JourneyOverview; map: JourneyMap }) {
  const projectId = overview.projectId;
  const step = overview.recommendedStep;
  const action = primaryAction(overview);
  const attention = overview.readiness.filter((signal) => signal.kind !== 'supported');
  const supported = overview.readiness.filter((signal) => signal.kind === 'supported');
  const completeStages = map.stages.filter((stage) => stage.status === 'complete').length;
  const stageIndex = map.stages.findIndex((stage) => stage.stage === overview.journey.currentStage);
  const stageNumber = stageIndex < 0 ? 1 : stageIndex + 1;
  const definition = JOURNEY_STAGE_DEFINITIONS[overview.journey.currentStage];

  return (
    <article className="overview-desk">
      <section className="overview-now" aria-labelledby="overview-now-title">
        <p className="overview-now-kicker">
          Now · {overview.stageLabel} · {humanize(overview.stageStatus)}
        </p>
        <h1 id="overview-now-title" className="overview-now-title">
          {overview.journey.currentObjective}
        </h1>
        <p className="overview-now-lede">{step?.whyNow ?? definition.founderQuestion}</p>
        {step === null ? null : (
          <p className="overview-now-meta">
            Effort: {step.expectedEffort ?? 'Varies'}. Outcome:{' '}
            {step.expectedOutcome ?? 'A record update you control.'}
          </p>
        )}
        <div className="overview-now-actions">
          <Link className="overview-now-primary min-h-11" href={action.href}>
            {action.label}
          </Link>
          <Link className="overview-now-secondary min-h-11" href={projectJourneyHref(projectId)}>
            See the journey
          </Link>
        </div>
      </section>

      <section className="overview-stats" aria-label="What needs you">
        <Link
          className={
            overview.pendingProposals.length > 0
              ? 'overview-stat overview-stat-alert'
              : 'overview-stat'
          }
          href={projectDecisionsHref(projectId)}
        >
          <span className="overview-stat-label">Waiting</span>
          <span className="overview-stat-value">{String(overview.pendingProposals.length)}</span>
          <span className="overview-stat-hint">
            {overview.pendingProposals.length === 0
              ? 'No proposals need a decision'
              : 'Recommendations stay drafts until you accept them'}
          </span>
        </Link>
        <Link className="overview-stat" href={projectModelHref(projectId)}>
          <span className="overview-stat-label">Uncertain</span>
          <span className="overview-stat-value">{String(attention.length)}</span>
          <span className="overview-stat-hint">
            {attention.length === 0
              ? 'Every record area has accepted content'
              : `${String(attention.length)} of ${String(overview.readiness.length || attention.length)} record areas still need you`}
          </span>
        </Link>
        <Link className="overview-stat" href={projectJourneyHref(projectId)}>
          <span className="overview-stat-label">Stage</span>
          <span className="overview-stat-value">
            {String(stageNumber)}
            <span className="overview-stat-of">/{String(map.stages.length)}</span>
          </span>
          <span className="overview-stat-hint">
            {overview.stageLabel}. {String(completeStages)} complete
          </span>
        </Link>
      </section>

      <div className="overview-split">
        <section className="overview-panel" aria-labelledby="overview-changed-title">
          <h2 id="overview-changed-title" className="overview-panel-title">
            Since you were away
          </h2>
          {overview.changeSummary === null ? (
            <div className="overview-empty">
              <p className="muted">Nothing is recorded yet. The next useful move is above.</p>
              <Link className="overview-text-link min-h-11" href={projectEvidenceHref(projectId)}>
                Capture an observation
              </Link>
            </div>
          ) : (
            <>
              <p className="overview-changed-title">{overview.changeSummary.title}</p>
              <p className="muted">{overview.changeSummary.explanation}</p>
              <p className="hint">
                {formatMessageTimestamp(overview.changeSummary.occurredAt)} · Continue:{' '}
                {overview.changeSummary.nextContinuation}
              </p>
            </>
          )}
          {overview.pendingProposals.length === 0 ? null : (
            <ul className="overview-proposal-list">
              {overview.pendingProposals.slice(0, 3).map((proposal) => (
                <li key={proposal.id}>
                  <Link
                    className="overview-text-link min-h-11"
                    href={projectDecisionsHref(projectId, proposal.id)}
                  >
                    {proposal.rationale}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overview-panel" aria-labelledby="overview-path-title">
          <h2 id="overview-path-title" className="overview-panel-title">
            Path
          </h2>
          <ol className="overview-path">
            {map.stages.map((stage) => (
              <li key={stage.stage}>
                <Link
                  className="overview-path-item"
                  href={
                    stage.stage === overview.journey.currentStage && step !== null
                      ? projectJourneyHref(projectId, step.id)
                      : projectJourneyHref(projectId)
                  }
                  aria-current={stage.stage === overview.journey.currentStage ? 'step' : undefined}
                  data-status={stage.status}
                >
                  <span className="overview-path-mark" aria-hidden="true" />
                  <span className="overview-path-label">{stage.label}</span>
                  <span className="sr-only">{humanize(stage.status)}</span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="hint">{definition.primaryOutcome}</p>
        </section>
      </div>

      <section className="overview-readiness" aria-labelledby="overview-readiness-title">
        <div className="overview-readiness-head">
          <h2 id="overview-readiness-title" className="overview-panel-title">
            Record readiness
          </h2>
          <p className="hint">
            Explanations of support — not a success score or real-world validation.
          </p>
        </div>
        <div className="overview-readiness-grid">
          <ReadinessColumn
            projectId={projectId}
            title="Needs attention"
            empty="Nothing is blocked, stale, or missing evidence."
            signals={attention.slice(0, 4)}
          />
          <ReadinessColumn
            projectId={projectId}
            title="Accepted so far"
            empty="No accepted record items yet."
            signals={supported.slice(0, 4)}
          />
        </div>
      </section>
    </article>
  );
}

function ReadinessColumn({
  projectId,
  title,
  empty,
  signals,
}: {
  projectId: string;
  title: string;
  empty: string;
  signals: JourneyOverview['readiness'];
}) {
  return (
    <div className="overview-readiness-col">
      <h3 className="overview-readiness-col-title">{title}</h3>
      {signals.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <ul className="overview-readiness-list">
          {signals.map((signal) => (
            <li key={signal.id}>
              <Link
                className="overview-readiness-item"
                href={projectModelHref(projectId, signal.section)}
              >
                <span className="overview-readiness-item-head">
                  <span className="text-sm font-medium">{signal.title}</span>
                  <span className="badge">{READINESS_LABEL[signal.kind]}</span>
                </span>
                <span className="muted">{signal.smallestAction}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
