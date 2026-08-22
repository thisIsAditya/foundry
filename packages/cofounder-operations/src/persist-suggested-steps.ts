import {
  getJourneyByProjectId,
  insertActivityEvent,
  insertJourneyStep,
  type Sql,
} from '@foundry/db';
import type { JourneyStage, Project, UserId } from '@foundry/domain';

export type SuggestedStepDraft = {
  stage: JourneyStage;
  objective: string;
  whyNow: string;
};

export async function persistSuggestedJourneySteps(
  tx: Sql,
  input: {
    project: Project;
    actorUserId: UserId;
    operationId?: string;
    steps: readonly SuggestedStepDraft[];
  },
): Promise<string[]> {
  if (input.steps.length === 0) {
    return [];
  }
  const journey = await getJourneyByProjectId(tx, input.project.id);
  if (journey === null) {
    return [];
  }
  const ids: string[] = [];
  for (const step of input.steps) {
    const created = await insertJourneyStep(tx, {
      journeyId: journey.id,
      workspaceId: journey.workspaceId,
      stage: step.stage,
      objective: step.objective,
      whyNow: step.whyNow,
      expectedEffort: 'About 15 minutes',
      expectedMinutes: 15,
      cofounderWillDo: 'This is a recommendation only. The stage does not change until you act.',
      expectedOutcome: 'A founder-controlled next step, not an automatic stage change.',
      status: 'proposed',
      recommended: false,
    });
    ids.push(created.id);
    await insertActivityEvent(tx, {
      projectId: input.project.id,
      workspaceId: input.project.workspaceId,
      eventType: 'journey_step_suggested',
      actorType: 'agent',
      actorId: input.actorUserId,
      journeyId: journey.id,
      stepId: created.id,
      payload: { operationId: input.operationId ?? null, objective: step.objective },
    });
  }
  return ids;
}
