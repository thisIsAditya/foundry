import { canMoveToStage } from '@foundry/domain';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { RevisitStage } from '../../../../../components/journey/revisit-stage';
import { projectJourneyHref } from '../../../../../lib/project-href';
import { createServerApi } from '../../../../../lib/trpc/server';

export const metadata: Metadata = { title: 'Journey' };

export default async function JourneyMapPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  try {
    const api = await createServerApi();
    const map = await api.journey.getMap({ projectId });
    return (
      <article className="stack">
        <header>
          <h1 className="page-title">Journey</h1>
          <p className="lede">
            Seven stages with a purpose, a visible outcome, and founder-sized steps. Defer or
            revisit with a reason; accepted record items stay until you change them.
          </p>
        </header>
        <ol className="stack">
          {map.stages.map((stage) => (
            <li key={stage.stage} className="panel stack-tight">
              <p className="callout-eyebrow">
                {stage.label} · {stage.status.replaceAll('_', ' ')}
              </p>
              <h2 className="card-title">{stage.founderQuestion}</h2>
              <p className="muted">Outcome: {stage.primaryOutcome}</p>
              <p className="hint">{stage.revisitConsequence}</p>
              {stage.steps.length === 0 ? (
                <p className="hint">No steps in this stage yet.</p>
              ) : (
                <ul className="stack-tight">
                  {stage.steps.map((step) => (
                    <li key={step.id}>
                      <Link
                        className="min-h-11 inline-flex items-center"
                        href={projectJourneyHref(projectId, step.id)}
                      >
                        {step.recommended ? 'Recommended: ' : ''}
                        {step.objective} ({step.status.replaceAll('_', ' ')})
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {stage.stage === map.journey.currentStage ? null : canMoveToStage(
                  map.journey.currentStage,
                  stage.stage,
                  'revisit',
                ) ? (
                <RevisitStage
                  projectId={projectId}
                  stage={stage.stage}
                  expectedRevision={map.journey.revision}
                  mode="revisit"
                  label={`Revisit ${stage.label}`}
                />
              ) : (
                <RevisitStage
                  projectId={projectId}
                  stage={stage.stage}
                  expectedRevision={map.journey.revision}
                  mode="skip_with_reason"
                  label={`Skip to ${stage.label}`}
                />
              )}
            </li>
          ))}
        </ol>
      </article>
    );
  } catch {
    notFound();
  }
}
