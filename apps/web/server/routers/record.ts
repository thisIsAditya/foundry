import {
  AcceptRecordChangesInputSchema,
  DefineExperimentInputSchema,
  ExportRecordInputSchema,
  GetReadinessInputSchema,
  GetRecordSectionInputSchema,
  ListRecordSectionsInputSchema,
  RecordAssumptionInputSchema,
  RecordDecisionV4InputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { recordReadProcedure, recordWriteProcedure, router } from '../trpc';

export const recordRouter = router({
  listSections: recordReadProcedure.input(ListRecordSectionsInputSchema).query(async ({ ctx }) => {
    return ctx.services.businessRecordService.listSections({
      membership: ctx.membership,
      project: ctx.project,
    });
  }),
  getSection: recordReadProcedure
    .input(GetRecordSectionInputSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.businessRecordService.getSection(
        { membership: ctx.membership, project: ctx.project },
        input.section,
      );
    }),
  export: recordReadProcedure.input(ExportRecordInputSchema).query(async ({ ctx }) => {
    const overview = await ctx.services.journeyService.getOverview({
      membership: ctx.membership,
      project: ctx.project,
    });
    return ctx.services.businessRecordService.exportRecord({
      membership: ctx.membership,
      project: ctx.project,
      currentStage: overview.journey.currentStage,
    });
  }),
  readiness: recordReadProcedure.input(GetReadinessInputSchema).query(async ({ ctx }) => {
    const overview = await ctx.services.journeyService.getOverview({
      membership: ctx.membership,
      project: ctx.project,
    });
    return overview.readiness;
  }),
  recordAssumption: recordWriteProcedure
    .meta({ invalidates: mutationInvalidations['record.recordAssumption'] })
    .input(RecordAssumptionInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('record.recordAssumption requires a user actor');
      }
      await ctx.services.businessRecordService.recordAssumption(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input.statement,
      );
      return { ok: true as const };
    }),
  recordDecision: recordWriteProcedure
    .meta({ invalidates: mutationInvalidations['record.recordDecision'] })
    .input(RecordDecisionV4InputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('record.recordDecision requires a user actor');
      }
      await ctx.services.businessRecordService.recordDecision(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        { statement: input.statement, rationale: input.rationale },
      );
      return { ok: true as const };
    }),
  defineExperiment: recordWriteProcedure
    .meta({ invalidates: mutationInvalidations['record.defineExperiment'] })
    .input(DefineExperimentInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('record.defineExperiment requires a user actor');
      }
      return ctx.services.experimentService.create(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        {
          projectId: ctx.project.id,
          hypothesis: input.successCriteria,
          method: input.name,
          threshold: {},
          idempotencyKey: input.idempotencyKey,
        },
      );
    }),
  acceptChanges: recordWriteProcedure
    .meta({ invalidates: mutationInvalidations['record.acceptChanges'] })
    .input(AcceptRecordChangesInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('record.acceptChanges requires a user actor');
      }
      const detail = await ctx.services.proposalService.get(
        { membership: ctx.membership, project: ctx.project },
        input.proposalId,
      );
      const selected = detail.changes.filter((change) => input.changeIds.includes(change.id));
      return ctx.services.businessRecordService.acceptChanges(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
        selected.map((change) => ({
          recordItemId: change.recordItemId,
          section: change.section,
          itemKey: change.itemKey,
          afterPayload: change.afterPayload,
        })),
      );
    }),
});
