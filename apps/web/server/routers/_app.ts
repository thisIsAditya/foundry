import { evidenceRouter } from './evidence';
import { projectRouter } from './project';
import { workspaceRouter } from './workspace';
import { router } from '../trpc';

export const appRouter = router({
  workspace: workspaceRouter,
  project: projectRouter,
  evidence: evidenceRouter,
});

export type AppRouter = typeof appRouter;
