import {
  CaptureEvidenceInputSchema,
  GetJourneyMapInputSchema,
  GetJourneyOverviewInputSchema,
  GetJourneyStepInputSchema,
  JourneyDeferStepInputSchema,
  JourneyRevisitStageInputSchema,
  JourneySetObjectiveInputSchema,
  JourneyStartStepInputSchema,
  JourneySubmitStepInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { journeyReadProcedure, journeyWriteProcedure, router } from '../trpc';

export const journeyRouter = router({
  getOverview: journeyReadProcedure.input(GetJourneyOverviewInputSchema).query(async ({ ctx }) => {
    return ctx.services.journeyService.getOverview({
      membership: ctx.membership,
      project: ctx.project,
    });
  }),
  getMap: journeyReadProcedure.input(GetJourneyMapInputSchema).query(async ({ ctx }) => {
    return ctx.services.journeyService.getMap({
      membership: ctx.membership,
      project: ctx.project,
    });
  }),
  getStep: journeyReadProcedure.input(GetJourneyStepInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.journeyService.getStep(
      { membership: ctx.membership, project: ctx.project },
      input.stepId,
    );
  }),
  setObjective: journeyWriteProcedure
    .meta({ invalidates: mutationInvalidations['journey.setObjective'] })
    .input(JourneySetObjectiveInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('journey.setObjective requires a user actor');
      }
      return ctx.services.journeyService.setObjective(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  startStep: journeyWriteProcedure
    .meta({ invalidates: mutationInvalidations['journey.startStep'] })
    .input(JourneyStartStepInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('journey.startStep requires a user actor');
      }
      return ctx.services.journeyService.startStep(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  submitStep: journeyWriteProcedure
    .meta({ invalidates: mutationInvalidations['journey.submitStep'] })
    .input(JourneySubmitStepInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('journey.submitStep requires a user actor');
      }
      return ctx.services.journeyService.submitStep(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  deferStep: journeyWriteProcedure
    .meta({ invalidates: mutationInvalidations['journey.deferStep'] })
    .input(JourneyDeferStepInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('journey.deferStep requires a user actor');
      }
      return ctx.services.journeyService.deferStep(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  revisitStage: journeyWriteProcedure
    .meta({ invalidates: mutationInvalidations['journey.revisitStage'] })
    .input(JourneyRevisitStageInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('journey.revisitStage requires a user actor');
      }
      return ctx.services.journeyService.revisitStage(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  captureEvidence: journeyWriteProcedure
    .meta({ invalidates: mutationInvalidations['journey.captureEvidence'] })
    .input(CaptureEvidenceInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('journey.captureEvidence requires a user actor');
      }
      if (input.kind === 'assumption') {
        await ctx.services.businessRecordService.recordAssumption(
          { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
          input.summary,
          input.idempotencyKey,
        );
        return { ok: true as const };
      }
      if (input.kind === 'interview') {
        await ctx.services.interviewService.addInterview(
          { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
          {
            projectId: ctx.project.id,
            participantType: input.participantType ?? 'known_contact',
            consent: { given: input.consentGiven === true },
            quotes: [input.summary],
            idempotencyKey: input.idempotencyKey,
          },
        );
      } else {
        await ctx.services.documentService.recordObservation(
          { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
          {
            projectId: ctx.project.id,
            summary: input.summary,
            idempotencyKey: input.idempotencyKey,
          },
        );
      }
      await ctx.services.businessRecordService.appendFounderNote(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        {
          summary: input.summary,
          kind: input.kind,
          idempotencyKey: input.idempotencyKey,
          ...(input.section === undefined ? {} : { section: input.section }),
        },
      );
      return { ok: true as const };
    }),
});
