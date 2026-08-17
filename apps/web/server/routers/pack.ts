import {
  AcceptAllSafeSectionsInputSchema,
  AcceptRevisionInputSchema,
  AcceptSectionInputSchema,
  AddFounderAssertionInputSchema,
  ExplainChangeInputSchema,
  ExportPackInputSchema,
  GetBusinessModelSectionInputSchema,
  GetPackDiffInputSchema,
  GetPackSectionInputSchema,
  ListBusinessModelSectionsInputSchema,
  ListRevisionsInputSchema,
  RejectRevisionInputSchema,
  UpsertBeachheadInputSchema,
  UpsertDmuInputSchema,
  UpsertPackSectionInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import {
  artifactReadProcedure,
  artifactWriteProcedure,
  projectAnswerProcedure,
  router,
} from '../trpc';

export const packRouter = router({
  export: artifactReadProcedure
    .meta({ invalidates: mutationInvalidations['pack.export'] })
    .input(ExportPackInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('pack.export requires a user actor');
      }
      return ctx.services.artifactService.exportPack(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  getSection: artifactReadProcedure
    .input(GetPackSectionInputSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.packService.getSection(
        { membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  getDiff: artifactReadProcedure.input(GetPackDiffInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.packService.getDiff(
      { membership: ctx.membership, project: ctx.project },
      input,
    );
  }),
  upsertSection: artifactWriteProcedure
    .meta({ invalidates: mutationInvalidations['pack.upsertSection'] })
    .input(UpsertPackSectionInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('pack.upsertSection requires a user actor');
      }
      return ctx.services.packService.upsertSection(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  upsertBeachhead: artifactWriteProcedure
    .meta({ invalidates: mutationInvalidations['pack.upsertBeachhead'] })
    .input(UpsertBeachheadInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('pack.upsertBeachhead requires a user actor');
      }
      return ctx.services.packService.upsertBeachhead(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  upsertDmu: artifactWriteProcedure
    .meta({ invalidates: mutationInvalidations['pack.upsertDmu'] })
    .input(UpsertDmuInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('pack.upsertDmu requires a user actor');
      }
      return ctx.services.packService.upsertDmu(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  addFounderAssertion: projectAnswerProcedure
    .meta({ invalidates: mutationInvalidations['pack.addFounderAssertion'] })
    .input(AddFounderAssertionInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('pack.addFounderAssertion requires a user actor');
      }
      return ctx.services.packService.addFounderAssertion(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  acceptRevision: artifactWriteProcedure
    .meta({ invalidates: mutationInvalidations['pack.acceptRevision'] })
    .input(AcceptRevisionInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('pack.acceptRevision requires a user actor');
      }
      return ctx.services.packService.acceptRevision(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  rejectRevision: artifactWriteProcedure
    .meta({ invalidates: mutationInvalidations['pack.rejectRevision'] })
    .input(RejectRevisionInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('pack.rejectRevision requires a user actor');
      }
      return ctx.services.packService.rejectRevision(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  listBusinessModelSections: artifactReadProcedure
    .input(ListBusinessModelSectionsInputSchema)
    .query(async ({ ctx }) => {
      return ctx.services.planSectionAggregatorService.listAll({
        membership: ctx.membership,
        project: ctx.project,
      });
    }),
  getBusinessModelSection: artifactReadProcedure
    .input(GetBusinessModelSectionInputSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.planSectionAggregatorService.getSection(
        { membership: ctx.membership, project: ctx.project },
        input.key,
      );
    }),
  listRevisions: artifactReadProcedure.input(ListRevisionsInputSchema).query(async ({ ctx }) => {
    return ctx.services.packService.listRevisions({
      membership: ctx.membership,
      project: ctx.project,
    });
  }),
  acceptSection: artifactWriteProcedure
    .meta({ invalidates: mutationInvalidations['pack.acceptSection'] })
    .input(AcceptSectionInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('pack.acceptSection requires a user actor');
      }
      return ctx.services.packService.acceptSection(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  acceptAllSafeSections: artifactWriteProcedure
    .meta({ invalidates: mutationInvalidations['pack.acceptAllSafeSections'] })
    .input(AcceptAllSafeSectionsInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('pack.acceptAllSafeSections requires a user actor');
      }
      return ctx.services.packService.acceptAllSafeSections(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  explainChange: artifactReadProcedure
    .input(ExplainChangeInputSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.packService.explainChange(
        { membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
});
