import {
  AddInterviewInputSchema,
  ConfirmUploadInputSchema,
  CreateUploadIntentInputSchema,
  DecideInterviewImportInputSchema,
  DeleteProjectMemoryInputSchema,
  GetInterviewImportInputSchema,
  ListEvidenceInputSchema,
  ListEvidenceLibraryInputSchema,
  ListInterviewImportsInputSchema,
  ListInterviewsInputSchema,
  ListProjectMemoryInputSchema,
  RecordObservationInputSchema,
  ReviewInterviewImportCandidateInputSchema,
  SearchEvidenceInputSchema,
  StartInterviewImportInputSchema,
  UpsertProjectMemoryInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { projectProcedure, projectReadProcedure, protectedProcedure, router } from '../trpc';

export const evidenceRouter = router({
  createUploadIntent: protectedProcedure
    .meta({ invalidates: mutationInvalidations['evidence.createUploadIntent'] })
    .input(CreateUploadIntentInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('protectedProcedure requires a user actor');
      }
      const resolved = await ctx.services.documentService.resolveUploadProject(
        { userId: ctx.actor.userId, memberships: ctx.actor.memberships },
        input,
        ctx.correlationId,
      );
      return ctx.services.documentService.createUploadIntent(
        { userId: ctx.actor.userId, membership: resolved.membership, project: resolved.project },
        input,
        ctx.correlationId,
      );
    }),
  addInterview: projectProcedure
    .meta({ invalidates: mutationInvalidations['evidence.addInterview'] })
    .input(AddInterviewInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('projectProcedure requires a user actor');
      }
      return ctx.services.interviewService.addInterview(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  listInterviews: projectReadProcedure.input(ListInterviewsInputSchema).query(async ({ ctx }) => {
    return ctx.services.interviewService.listInterviews({
      membership: ctx.membership,
      project: ctx.project,
    });
  }),
  confirmUpload: protectedProcedure
    .meta({ invalidates: mutationInvalidations['evidence.confirmUpload'] })
    .input(ConfirmUploadInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('protectedProcedure requires a user actor');
      }
      return ctx.services.documentService.confirmUpload(
        { userId: ctx.actor.userId, memberships: ctx.actor.memberships },
        input,
        ctx.correlationId,
      );
    }),
  list: projectReadProcedure.input(ListEvidenceInputSchema).query(async ({ ctx }) => {
    return ctx.services.documentService.list(ctx.membership, ctx.project, ctx.correlationId);
  }),
  search: projectReadProcedure.input(SearchEvidenceInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.documentService.search(
      ctx.membership,
      ctx.project,
      input,
      ctx.correlationId,
    );
  }),
  listLibrary: projectReadProcedure
    .input(ListEvidenceLibraryInputSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.documentService.listLibrary(ctx.membership, ctx.project, input.filter);
    }),
  recordObservation: projectProcedure
    .meta({ invalidates: mutationInvalidations['evidence.recordObservation'] })
    .input(RecordObservationInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('projectProcedure requires a user actor');
      }
      return ctx.services.documentService.recordObservation(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  startInterviewImport: projectProcedure
    .meta({ invalidates: mutationInvalidations['evidence.startInterviewImport'] })
    .input(StartInterviewImportInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('projectProcedure requires a user actor');
      }
      return ctx.services.interviewImportService.start(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  listInterviewImports: projectReadProcedure
    .input(ListInterviewImportsInputSchema)
    .query(async ({ ctx }) => {
      return ctx.services.interviewImportService.list({
        membership: ctx.membership,
        project: ctx.project,
      });
    }),
  getInterviewImport: projectReadProcedure
    .input(GetInterviewImportInputSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.interviewImportService.get(
        { membership: ctx.membership, project: ctx.project },
        input.batchId,
      );
    }),
  reviewInterviewImportCandidate: projectProcedure
    .meta({ invalidates: mutationInvalidations['evidence.reviewInterviewImportCandidate'] })
    .input(ReviewInterviewImportCandidateInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('projectProcedure requires a user actor');
      }
      return ctx.services.interviewImportService.reviewCandidate(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  decideInterviewImport: projectProcedure
    .meta({ invalidates: mutationInvalidations['evidence.decideInterviewImport'] })
    .input(DecideInterviewImportInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('projectProcedure requires a user actor');
      }
      return ctx.services.interviewImportService.decide(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  listMemory: projectReadProcedure.input(ListProjectMemoryInputSchema).query(async ({ ctx }) => {
    return ctx.services.memoryService.list({ membership: ctx.membership, project: ctx.project });
  }),
  upsertMemory: projectProcedure
    .meta({ invalidates: mutationInvalidations['evidence.upsertMemory'] })
    .input(UpsertProjectMemoryInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('projectProcedure requires a user actor');
      }
      return ctx.services.memoryService.upsert(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  deleteMemory: projectProcedure
    .meta({ invalidates: mutationInvalidations['evidence.deleteMemory'] })
    .input(DeleteProjectMemoryInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('projectProcedure requires a user actor');
      }
      return ctx.services.memoryService.remove(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
});
