import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { StepActions } from '../../../../../../components/journey/step-actions';
import { createServerApi } from '../../../../../../lib/trpc/server';

export const metadata: Metadata = { title: 'Journey step' };

export default async function JourneyStepPage({
  params,
}: {
  params: Promise<{ projectId: string; stepId: string }>;
}) {
  const { projectId, stepId } = await params;
  try {
    const api = await createServerApi();
    const step = await api.journey.getStep({ projectId, stepId });
    return (
      <article className="stack">
        <header>
          <h1 className="page-title">{step.objective}</h1>
          <p className="lede">{step.whyNow}</p>
        </header>
        <section className="panel stack-tight">
          <p className="hint">Status: {step.status.replaceAll('_', ' ')}</p>
          <p className="muted">Effort: {step.expectedEffort ?? 'Varies'}</p>
          <p className="muted">
            Expected outcome: {step.expectedOutcome ?? 'A record update you control.'}
          </p>
          <p className="muted">
            The co-founder will: {step.cofounderWillDo ?? 'Help you complete this step.'}
          </p>
          {step.deferReason === null ? null : <p className="hint">Deferred: {step.deferReason}</p>}
          {step.skipReason === null ? null : <p className="hint">Skipped: {step.skipReason}</p>}
        </section>
        <StepActions projectId={projectId} step={step} />
      </article>
    );
  } catch {
    notFound();
  }
}
