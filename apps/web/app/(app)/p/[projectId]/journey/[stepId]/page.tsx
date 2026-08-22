import { recordSectionForJourneyStage } from '@foundry/domain';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RecordSectionEditor } from '../../../../../../components/journey/record-section-editor';
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
    const [step, overview] = await Promise.all([
      api.journey.getStep({ projectId, stepId }),
      api.journey.getOverview({ projectId }),
    ]);
    const recordSection = recordSectionForJourneyStage(step.stage);
    const [detail, ideaDetail] = await Promise.all([
      api.record.getSection({ projectId, section: recordSection }),
      step.stage === 'idea'
        ? Promise.resolve(null)
        : api.record.getSection({ projectId, section: 'idea_founder_context' }),
    ]);
    const alreadyCaptured =
      step.stage === 'idea' &&
      overview.journey.currentStage === 'idea' &&
      (detail?.item.content.summary.trim().length ?? 0) > 0;
    return (
      <article className="stack">
        <header>
          <h1 className="page-title">
            {alreadyCaptured ? 'Your idea is already recorded' : step.objective}
          </h1>
          <p className="lede">
            {alreadyCaptured
              ? 'Continue to define the problem instead of re-entering the idea you supplied at creation.'
              : step.whyNow}
          </p>
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
        {ideaDetail === null || ideaDetail.item.content.summary.trim().length === 0 ? null : (
          <section className="panel stack-tight" aria-labelledby="founder-context-title">
            <p className="callout-eyebrow">Starting context</p>
            <h2 className="card-title" id="founder-context-title">
              What you already told us
            </h2>
            <p className="text-sm">{ideaDetail.item.content.summary}</p>
            <p className="hint">
              This is founder input, not validated evidence. Use it to frame this step; do not
              repeat it as the problem unless it is the recurring problem you mean to state.
            </p>
          </section>
        )}
        {alreadyCaptured ? null : (
          <RecordSectionEditor
            projectId={projectId}
            detail={detail}
            title={`Add your ${detail.label.toLowerCase()}`}
            description={`This is the founder input for the current ${step.stage.replaceAll('_', ' ')} step. Save it before completing the step.`}
          />
        )}
        <StepActions
          projectId={projectId}
          step={step}
          journey={overview.journey}
          recordSection={recordSection}
          recordSaved={detail?.item.status === 'accepted'}
          alreadyCaptured={alreadyCaptured}
        />
      </article>
    );
  } catch {
    notFound();
  }
}
