import type { JourneyOverview } from '@foundry/api-contracts';
import {
  RECORD_SECTION_DEFINITIONS,
  type CofounderInteractionType,
  type JourneyStage,
  type JourneyStep as JourneyStepModel,
  type RecordProvenance,
  type RecordSectionKey,
} from '@foundry/domain';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { projectJourneyHref, projectModelHref } from '../../lib/project-href';

const PROVENANCE_LABEL: Record<RecordProvenance, string> = {
  founder_input: 'Founder input',
  cited_evidence: 'Cited evidence',
  derived: 'Derived',
  ai_proposal: 'AI proposal',
  founder_approved: 'Founder approved',
  unverified: 'Unverified',
  contradicted: 'Contradicted',
};

export function ProvenanceBadge({
  provenance,
  stale,
}: {
  provenance: RecordProvenance;
  stale?: boolean;
}) {
  const label = stale === true ? 'Stale' : PROVENANCE_LABEL[provenance];
  return (
    <span className="badge" title={label}>
      {label}
    </span>
  );
}

export function JourneyStageStrip({
  projectId,
  stage,
  stageLabel,
  objective,
  status,
}: {
  projectId: string;
  stage: JourneyStage;
  stageLabel: string;
  objective: string;
  status: string;
}) {
  return (
    <section
      className="journey-stage-strip"
      aria-label={`Current stage: ${stageLabel}`}
      data-stage={stage}
    >
      <p className="callout-eyebrow">
        {stageLabel} · {status.replaceAll('_', ' ')}
      </p>
      <p className="callout-title">{objective}</p>
      <Link className="btn-secondary min-h-11" href={projectJourneyHref(projectId)}>
        Open journey map
      </Link>
    </section>
  );
}

export function ChangeSummaryCard({
  title,
  explanation,
  nextContinuation,
}: {
  title: string;
  explanation: string;
  nextContinuation: string;
}) {
  return (
    <section className="panel" aria-labelledby="change-summary-title">
      <h2 id="change-summary-title" className="card-title">
        Since you were away
      </h2>
      <p className="text-sm font-medium">{title}</p>
      <p className="muted">{explanation}</p>
      <p className="muted">Continue: {nextContinuation}</p>
    </section>
  );
}

export function ReadinessList({ signals }: { signals: JourneyOverview['readiness'] }) {
  return (
    <section aria-labelledby="readiness-title">
      <h2 id="readiness-title" className="card-title">
        Readiness
      </h2>
      <p className="hint">These are explanations, not a success score or real-world validation.</p>
      <ul className="stack">
        {signals.slice(0, 6).map((signal) => (
          <li key={signal.id} className="panel">
            <p className="text-sm font-medium">
              {signal.title} · {signal.kind.replaceAll('_', ' ')}
            </p>
            <p className="muted">{signal.explanation}</p>
            <p className="hint">{signal.smallestAction}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecommendedStepCard({
  projectId,
  step,
  alternatives,
}: {
  projectId: string;
  step: JourneyStepModel | null;
  alternatives: readonly JourneyStepModel[];
}) {
  if (step === null) {
    return (
      <section className="callout">
        <p className="callout-eyebrow">Next step</p>
        <p className="callout-title">No recommended step yet</p>
        <p className="muted">Open the journey map to choose a stage or defer with a reason.</p>
      </section>
    );
  }
  return (
    <section className="callout">
      <p className="callout-eyebrow">Recommended now</p>
      <p className="callout-title">{step.objective}</p>
      <p className="muted">{step.whyNow}</p>
      <p className="hint">
        Effort: {step.expectedEffort ?? 'Varies'}. Outcome:{' '}
        {step.expectedOutcome ?? 'A record update you control.'}
      </p>
      <p className="hint">
        The co-founder will: {step.cofounderWillDo ?? 'Help you complete this step.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link className="btn min-h-11" href={projectJourneyHref(projectId, step.id)}>
          Start this step
        </Link>
        {alternatives.slice(0, 2).map((item) => (
          <Link
            key={item.id}
            className="btn-secondary min-h-11"
            href={projectJourneyHref(projectId, item.id)}
          >
            {item.objective}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function InteractionTypeFrame({
  type,
  children,
}: {
  type: CofounderInteractionType;
  children: ReactNode;
}) {
  return (
    <section className="panel" aria-label={`Co-founder ${type}`}>
      <p className="callout-eyebrow">{type}</p>
      {children}
    </section>
  );
}

export function RecordSectionLink({
  projectId,
  section,
}: {
  projectId: string;
  section: RecordSectionKey;
}) {
  return (
    <Link
      className="nav-link min-h-11 inline-flex items-center"
      href={projectModelHref(projectId, section)}
    >
      {RECORD_SECTION_DEFINITIONS[section].label}
    </Link>
  );
}
