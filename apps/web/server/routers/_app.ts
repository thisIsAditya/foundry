import { projectRouter } from './project';
import { workspaceRouter } from './workspace';
import { router } from '../trpc';

export const appRouter = router({
  workspace: workspaceRouter,
  project: projectRouter,
});

export type AppRouter = typeof appRouter;
