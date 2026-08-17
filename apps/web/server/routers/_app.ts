import { evidenceRouter } from './evidence';
import { mcpServerRouter } from './mcp-server';
import { projectRouter } from './project';
import { providerRouter } from './provider';
import { sprintRouter } from './sprint';
import { workspaceRouter } from './workspace';
import { router } from '../trpc';

export const appRouter = router({
  workspace: workspaceRouter,
  project: projectRouter,
  evidence: evidenceRouter,
  provider: providerRouter,
  mcpServer: mcpServerRouter,
  sprint: sprintRouter,
});

export type AppRouter = typeof appRouter;
