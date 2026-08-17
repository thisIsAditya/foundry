import type { JourneyPhase } from '@foundry/domain';

import { JOURNEY_STEPS, journeyStepIndex } from '../../lib/journey';

/**
 * Horizontal progress map of the founder journey. Shows every phase as a dot;
 * done phases are filled, the current phase is highlighted, later phases are muted.
 */
export function JourneyStepper({ phase }: { phase: JourneyPhase }) {
  const currentIndex = journeyStepIndex(phase);
  const current = JOURNEY_STEPS[currentIndex];

  return (
    <div className="flex flex-col gap-2">
      <div className="journey" aria-label="Founder journey progress">
        {JOURNEY_STEPS.map((step, index) => {
          const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo';
          return (
            <span key={step.phase} className="flex items-center">
              <span
                className={`journey-dot journey-dot-${state}`}
                title={`${String(index + 1)}. ${step.title}`}
              >
                {state === 'done' ? '✓' : index + 1}
              </span>
              {index < JOURNEY_STEPS.length - 1 ? <span className="journey-connector" /> : null}
            </span>
          );
        })}
      </div>
      {current === undefined ? null : (
        <p className="hint">
          Step {currentIndex + 1} of {JOURNEY_STEPS.length} · {current.title}
        </p>
      )}
    </div>
  );
}
