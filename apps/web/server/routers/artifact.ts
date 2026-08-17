import {
  ExportArtifactInputSchema,
  GenerateArtifactInputSchema,
  GenerateWorkbookInputSchema,
  GetArtifactVersionInputSchema,
  GetMoneyRulesInputSchema,
} from '@foundry/api-contracts';

import { mutationInvalidations } from '../../lib/trpc/invalidation-map';
import { artifactReadProcedure, artifactWriteProcedure, router } from '../trpc';

export const artifactRouter = router({
  list: artifactReadProcedure.input(GetMoneyRulesInputSchema).query(async ({ ctx }) => {
    return ctx.services.artifactService.list({
      membership: ctx.membership,
      project: ctx.project,
    });
  }),
  generate: artifactWriteProcedure
    .meta({ invalidates: mutationInvalidations['artifact.generate'] })
    .input(GenerateArtifactInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('artifactWriteProcedure requires a user actor');
      }
      return ctx.services.artifactService.generate(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  regenerate: artifactWriteProcedure
    .meta({ invalidates: mutationInvalidations['artifact.regenerate'] })
    .input(GenerateArtifactInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('artifactWriteProcedure requires a user actor');
      }
      return ctx.services.artifactService.generate(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  generateWorkbook: artifactWriteProcedure
    .meta({ invalidates: mutationInvalidations['artifact.generateWorkbook'] })
    .input(GenerateWorkbookInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.actor.type !== 'user') {
        throw new Error('artifactWriteProcedure requires a user actor');
      }
      return ctx.services.artifactService.generateWorkbook(
        { userId: ctx.actor.userId, membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  getVersion: artifactReadProcedure
    .input(GetArtifactVersionInputSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.artifactService.getVersion(
        { membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
  export: artifactReadProcedure
    .input(ExportArtifactInputSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.artifactService.export(
        { membership: ctx.membership, project: ctx.project },
        input,
      );
    }),
});
