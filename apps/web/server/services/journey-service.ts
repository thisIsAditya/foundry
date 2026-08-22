import type {
  JourneyMap,
  JourneyOverview,
  JourneyRevisitStageInput,
  JourneySetObjectiveInput,
  JourneyStartStepInput,
  JourneySubmitStepInput,
  JourneyDeferStepInput,
} from '@foundry/api-contracts';
import {
  getJourneyByProjectId,
  insertActivityEvent,
  insertCommandReceipt,
  insertJourney,
  insertJourneyStageState,
  insertJourneyStep,
  insertJourneyTransition,
  insertRecordItem,
  getCommandReceipt,
  getJourneyStepById,
  listActivityEventsByProjectId,
  listJourneyStageStates,
  listJourneySteps,
  listProposalsV4ByProjectId,
  listRecordItemsByProjectId,
  updateJourneyStageState,
  updateJourneyState,
  updateJourneyStepStatus,
  updateProjectCurrentPhase,
  withWorkspaceScope,
  type PoolSql,
  type Sql,
} from '@foundry/db';
import {
  JOURNEY_STAGE_DEFINITIONS,
  JourneyStages,
  RECORD_SECTION_DEFINITIONS,
  RecordSectionKeys,
  alternativeSteps,
  canMoveToStage,
  canTransitionJourneyStageStatus,
  canTransitionJourneyStepStatus,
  firstRecommendedStep,
  legacyPhaseFromJourneyStage,
  readinessSignal,
  type Journey,
  type JourneyStageStatus,
  type JourneyStep,
  type JourneyStepStatus,
  type Project,
  type UserId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';

function staleRevision(): AppError {
  return new AppError({
    code: 'stale_revision',
    explanation: 'This journey changed since you loaded it.',
    nextAction: 'Reload the current stage and review the newer version.',
  });
}

function forbidden(explanation: string, nextAction: string): AppError {
  return new AppError({
    code: 'policy_forbidden',
    explanation,
    nextAction,
  });
}

function invalid(explanation: string, nextAction: string): AppError {
  return new AppError({
    code: 'invalid_input',
    explanation,
    nextAction,
  });
}

export class JourneyService {
  constructor(
    private readonly sql: PoolSql,
    private readonly policyService: PolicyService,
  ) {}

  async bootstrap(
    tx: Sql,
    input: {
      project: Project;
      actorId: string;
      ideaText?: string;
      geography?: string | null;
      objective?: string | null;
      constraints?: string | null;
      urgency?: string | null;
      customerHint?: string | null;
    },
  ): Promise<Journey> {
    const existing = await getJourneyByProjectId(tx, input.project.id);
    if (existing !== null) {
      return existing;
    }
    const step = firstRecommendedStep({
      ideaText: input.ideaText ?? input.project.name,
      geography: input.geography ?? input.project.geography,
      objective: input.objective ?? input.project.founderObjective,
      constraints: input.constraints ?? null,
      urgency: input.urgency ?? null,
      customerHint: input.customerHint ?? null,
    });
    const journey = await insertJourney(tx, {
      projectId: input.project.id,
      workspaceId: input.project.workspaceId,
      currentStage: step.stage,
      currentObjective: step.objective,
    });
    for (const stage of JourneyStages) {
      const status: JourneyStageStatus = stage === step.stage ? 'in_progress' : 'not_started';
      await insertJourneyStageState(tx, {
        journeyId: journey.id,
        workspaceId: journey.workspaceId,
        stage,
        status,
        goal: JOURNEY_STAGE_DEFINITIONS[stage].founderQuestion,
      });
    }
    const ideaText = (input.ideaText ?? '').trim();
    for (const section of RecordSectionKeys) {
      const definition = RECORD_SECTION_DEFINITIONS[section];
      const isIdea = section === 'idea_founder_context' && ideaText.length > 0;
      await insertRecordItem(tx, {
        projectId: input.project.id,
        workspaceId: input.project.workspaceId,
        section,
        itemKey: definition.defaultItemKey,
        title: definition.label,
        content: {
          summary: isIdea ? ideaText : '',
          fields: {
            ...(input.geography === undefined || input.geography === null
              ? {}
              : { geography: input.geography }),
            ...(input.constraints === undefined || input.constraints === null
              ? {}
              : { constraints: input.constraints }),
            ...(input.urgency === undefined || input.urgency === null
              ? {}
              : { urgency: input.urgency }),
          },
        },
        status: isIdea ? 'draft' : 'empty',
        provenance: isIdea ? 'founder_input' : 'unverified',
      });
    }
    await insertJourneyStep(tx, {
      journeyId: journey.id,
      workspaceId: journey.workspaceId,
      stage: step.stage,
      objective: step.objective,
      whyNow: step.whyNow,
      expectedEffort: step.expectedEffort,
      expectedMinutes: step.expectedMinutes,
      cofounderWillDo: step.cofounderWillDo,
      expectedOutcome: step.expectedOutcome,
      status: step.status,
      recommended: true,
    });
    for (const alternative of alternativeSteps(step.stage)) {
      await insertJourneyStep(tx, {
        journeyId: journey.id,
        workspaceId: journey.workspaceId,
        stage: alternative.stage,
        objective: alternative.objective,
        whyNow: alternative.whyNow,
        expectedEffort: alternative.expectedEffort,
        expectedMinutes: alternative.expectedMinutes,
        cofounderWillDo: alternative.cofounderWillDo,
        expectedOutcome: alternative.expectedOutcome,
        status: 'proposed',
        recommended: false,
      });
    }
    await insertJourneyTransition(tx, {
      journeyId: journey.id,
      workspaceId: journey.workspaceId,
      actorType: 'founder',
      actorId: input.actorId,
      cause: 'journey.create',
      fromState: { stage: null },
      toState: { stage: journey.currentStage, objective: journey.currentObjective },
      command: 'journey.create',
    });
    await insertActivityEvent(tx, {
      projectId: input.project.id,
      workspaceId: input.project.workspaceId,
      eventType: 'journey_created',
      actorType: 'founder',
      actorId: input.actorId,
      journeyId: journey.id,
      payload: { stage: journey.currentStage },
    });
    await updateProjectCurrentPhase(
      tx,
      input.project.id,
      legacyPhaseFromJourneyStage(journey.currentStage),
    );
    return journey;
  }

  async getOverview(actor: {
    membership: WorkspaceMembership;
    project: Project;
  }): Promise<JourneyOverview> {
    if (!this.policyService.can(actor.membership, 'journey.read')) {
      throw forbidden(
        'Your role cannot read this journey.',
        'Ask a workspace admin to change your role.',
      );
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const journey = await this.requireJourney(tx, actor.project);
      const [stages, steps, items, proposals, activity] = await Promise.all([
        listJourneyStageStates(tx, journey.id),
        listJourneySteps(tx, journey.id),
        listRecordItemsByProjectId(tx, actor.project.id),
        listProposalsV4ByProjectId(tx, actor.project.id),
        listActivityEventsByProjectId(tx, actor.project.id, 8),
      ]);
      const currentStage = stages.find((item) => item.stage === journey.currentStage);
      const recommended = steps.find((item) => item.recommended) ?? null;
      const latest = activity[0];
      return {
        projectId: actor.project.id,
        journey,
        stageLabel: JOURNEY_STAGE_DEFINITIONS[journey.currentStage].label,
        stageStatus: currentStage?.status ?? 'in_progress',
        recommendedStep: recommended,
        alternativeSteps: steps.filter((item) => !item.recommended && item.status === 'proposed'),
        pendingProposals: proposals.filter(
          (item) => item.status === 'awaiting_founder' || item.status === 'draft',
        ),
        changeSummary:
          latest === undefined
            ? null
            : {
                title: latest.eventType.replaceAll('_', ' '),
                explanation: 'This is what changed since the last recorded founder-readable event.',
                occurredAt: latest.createdAt,
                nextContinuation: journey.currentObjective,
              },
        activeSteps: steps.filter((item) =>
          ['ready', 'in_progress', 'awaiting_founder', 'submitted'].includes(item.status),
        ),
        deferredSteps: steps.filter((item) => item.status === 'deferred'),
        blockedSteps: steps.filter((item) => item.status === 'blocked'),
        readiness: items.map((item) =>
          readinessSignal({
            section: item.section,
            label: item.title,
            status: item.status,
            provenance: item.provenance,
            smallestAction: RECORD_SECTION_DEFINITIONS[item.section].smallestAction,
          }),
        ),
        activity,
      };
    });
  }

  async getMap(actor: { membership: WorkspaceMembership; project: Project }): Promise<JourneyMap> {
    if (!this.policyService.can(actor.membership, 'journey.read')) {
      throw forbidden(
        'Your role cannot read this journey.',
        'Ask a workspace admin to change your role.',
      );
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const journey = await this.requireJourney(tx, actor.project);
      const [stages, steps] = await Promise.all([
        listJourneyStageStates(tx, journey.id),
        listJourneySteps(tx, journey.id),
      ]);
      return {
        projectId: actor.project.id,
        journey,
        stages: JourneyStages.map((stage) => {
          const state = stages.find((item) => item.stage === stage);
          const definition = JOURNEY_STAGE_DEFINITIONS[stage];
          return {
            stage,
            label: definition.label,
            founderQuestion: definition.founderQuestion,
            primaryOutcome: definition.primaryOutcome,
            status: state?.status ?? 'not_started',
            goal: state?.goal ?? definition.founderQuestion,
            outcome: state?.outcome ?? null,
            steps: steps.filter((item) => item.stage === stage),
            blockers:
              state?.blockReason === null || state?.blockReason === undefined
                ? []
                : [state.blockReason],
            revisitConsequence:
              stage === journey.currentStage
                ? 'You are here. Changing this stage keeps accepted record items and marks dependents stale.'
                : 'Revisiting this stage keeps old evidence and marks later accepted items stale.',
          };
        }),
      };
    });
  }

  async getStep(
    actor: { membership: WorkspaceMembership; project: Project },
    stepId: JourneyStep['id'],
  ): Promise<JourneyStep> {
    if (!this.policyService.can(actor.membership, 'journey.read')) {
      throw forbidden(
        'Your role cannot read this step.',
        'Ask a workspace admin to change your role.',
      );
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const step = await getJourneyStepById(tx, stepId);
      if (step === null) {
        throw new AppError({
          code: 'not_found',
          explanation: 'That journey step was not found.',
          nextAction: 'Open the journey map and pick a current step.',
        });
      }
      return step;
    });
  }

  async setObjective(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: JourneySetObjectiveInput,
  ): Promise<Journey> {
    return this.mutate(actor, 'journey.setObjective', input.idempotencyKey, async (tx, journey) => {
      const updated = await updateJourneyState(tx, journey.id, {
        expectedRevision: input.expectedRevision,
        currentObjective: input.objective,
      });
      if (updated === null) {
        throw staleRevision();
      }
      await insertJourneyTransition(tx, {
        journeyId: journey.id,
        workspaceId: journey.workspaceId,
        actorType: 'founder',
        actorId: actor.userId,
        cause: 'journey.setObjective',
        fromState: { objective: journey.currentObjective },
        toState: { objective: updated.currentObjective },
        command: 'journey.setObjective',
      });
      return updated;
    });
  }

  async startStep(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: JourneyStartStepInput,
  ): Promise<JourneyStep> {
    return this.mutate(actor, 'journey.startStep', input.idempotencyKey, async (tx) => {
      const step = await getJourneyStepById(tx, input.stepId);
      if (step === null) {
        throw new AppError({
          code: 'not_found',
          explanation: 'That journey step was not found.',
          nextAction: 'Open the journey map and pick a current step.',
        });
      }
      if (step.revision !== input.expectedRevision) {
        throw staleRevision();
      }
      const updated = await advanceStepStatuses(tx, step, ['ready', 'in_progress']);
      await insertActivityEvent(tx, {
        projectId: actor.project.id,
        workspaceId: actor.project.workspaceId,
        eventType: 'journey_step_started',
        actorType: 'founder',
        actorId: actor.userId,
        journeyId: step.journeyId,
        stepId: step.id,
      });
      return updated;
    });
  }

  async submitStep(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: JourneySubmitStepInput,
  ): Promise<JourneyStep> {
    return this.mutate(actor, 'journey.submitStep', input.idempotencyKey, async (tx) => {
      const step = await getJourneyStepById(tx, input.stepId);
      if (step === null) {
        throw new AppError({
          code: 'not_found',
          explanation: 'That journey step was not found.',
          nextAction: 'Open the journey map and pick a current step.',
        });
      }
      if (step.revision !== input.expectedRevision) {
        throw staleRevision();
      }
      const updated = await advanceStepStatuses(tx, step, ['submitted', 'reviewed', 'complete'], {
        completionEvidence: input.completionEvidence,
      });
      await insertActivityEvent(tx, {
        projectId: actor.project.id,
        workspaceId: actor.project.workspaceId,
        eventType: 'journey_step_completed',
        actorType: 'founder',
        actorId: actor.userId,
        journeyId: step.journeyId,
        stepId: step.id,
      });
      return updated;
    });
  }

  async deferStep(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: JourneyDeferStepInput,
  ): Promise<JourneyStep> {
    return this.mutate(actor, 'journey.deferStep', input.idempotencyKey, async (tx) => {
      const step = await getJourneyStepById(tx, input.stepId);
      if (step === null) {
        throw new AppError({
          code: 'not_found',
          explanation: 'That journey step was not found.',
          nextAction: 'Open the journey map and pick a current step.',
        });
      }
      if (step.revision !== input.expectedRevision) {
        throw staleRevision();
      }
      const nextStatus = input.skip ? 'skipped_with_reason' : 'deferred';
      if (!canTransitionJourneyStepStatus(step.status, nextStatus)) {
        throw invalid(
          'This step cannot be deferred from its current status.',
          'Pick another step.',
        );
      }
      const updated = await updateJourneyStepStatus(tx, step.id, {
        expectedRevision: input.expectedRevision,
        status: nextStatus,
        deferReason: input.skip ? null : input.reason,
        skipReason: input.skip ? input.reason : null,
      });
      if (updated === null) {
        throw staleRevision();
      }
      return updated;
    });
  }

  async revisitStage(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: JourneyRevisitStageInput,
  ): Promise<Journey> {
    return this.mutate(actor, 'journey.revisitStage', input.idempotencyKey, async (tx, journey) => {
      if (!canMoveToStage(journey.currentStage, input.stage, input.mode, input.reason)) {
        throw invalid(
          'That stage move is not allowed without an explicit reason.',
          'Advance one stage, revisit an earlier one, or skip with a reason.',
        );
      }
      const stages = await listJourneyStageStates(tx, journey.id);
      const current = stages.find((item) => item.stage === journey.currentStage);
      if (current !== undefined && canTransitionJourneyStageStatus(current.status, 'revisited')) {
        await updateJourneyStageState(tx, journey.id, journey.currentStage, {
          status: 'revisited',
        });
      }
      const target = stages.find((item) => item.stage === input.stage);
      if (target !== undefined) {
        const nextStatus: JourneyStageStatus = canTransitionJourneyStageStatus(
          target.status,
          'in_progress',
        )
          ? 'in_progress'
          : target.status;
        await updateJourneyStageState(tx, journey.id, input.stage, {
          status: nextStatus,
          deferReason: input.reason ?? null,
        });
      }
      const updated = await updateJourneyState(tx, journey.id, {
        expectedRevision: input.expectedRevision,
        currentStage: input.stage,
        currentObjective: JOURNEY_STAGE_DEFINITIONS[input.stage].recommendedObjective,
      });
      if (updated === null) {
        throw staleRevision();
      }
      await updateProjectCurrentPhase(
        tx,
        actor.project.id,
        legacyPhaseFromJourneyStage(updated.currentStage),
      );
      await insertJourneyTransition(tx, {
        journeyId: journey.id,
        workspaceId: journey.workspaceId,
        actorType: 'founder',
        actorId: actor.userId,
        cause: input.mode,
        fromState: { stage: journey.currentStage },
        toState: { stage: updated.currentStage, reason: input.reason ?? null },
        command: 'journey.revisitStage',
      });
      return updated;
    });
  }

  private async requireJourney(tx: Sql, project: Project): Promise<Journey> {
    const journey = await getJourneyByProjectId(tx, project.id);
    if (journey === null) {
      return this.bootstrap(tx, { project, actorId: 'system' });
    }
    return journey;
  }

  private async mutate<T>(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    command: string,
    idempotencyKey: string,
    run: (tx: Sql, journey: Journey) => Promise<T>,
  ): Promise<T> {
    if (!this.policyService.can(actor.membership, 'journey.write')) {
      throw forbidden(
        'Your role cannot change this journey.',
        'Ask a workspace admin to change your role.',
      );
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const existing = await getCommandReceipt(tx, actor.userId, command, idempotencyKey);
      if (existing !== null) {
        return existing as T;
      }
      const journey = await this.requireJourney(tx, actor.project);
      const result = await run(tx, journey);
      await insertCommandReceipt(tx, {
        workspaceId: actor.project.workspaceId,
        projectId: actor.project.id,
        actorId: actor.userId,
        command,
        idempotencyKey,
        result,
      });
      return result;
    });
  }
}

async function advanceStepStatuses(
  tx: Sql,
  step: JourneyStep,
  targets: readonly JourneyStepStatus[],
  extras: { completionEvidence?: unknown } = {},
): Promise<JourneyStep> {
  let current = step;
  for (const status of targets) {
    if (current.status === status) {
      continue;
    }
    if (!canTransitionJourneyStepStatus(current.status, status)) {
      throw invalid(
        'This step cannot move to that status from where it is now.',
        'Start the step first, or pick another step on the journey map.',
      );
    }
    const updated = await updateJourneyStepStatus(tx, current.id, {
      expectedRevision: current.revision,
      status,
      completionEvidence: extras.completionEvidence,
    });
    if (updated === null) {
      throw staleRevision();
    }
    current = updated;
  }
  return current;
}
