import { artifactRouter } from './artifact';
import { evidenceRouter } from './evidence';
import { mcpServerRouter } from './mcp-server';
import { moneyRulesRouter } from './money-rules';
import { packRouter } from './pack';
import { projectRouter } from './project';
import { providerRouter } from './provider';
import { sprintRouter } from './sprint';
import { workspaceRouter } from './workspace';
import { wtpRouter } from './wtp';
import { router } from '../trpc';

export const appRouter = router({
  workspace: workspaceRouter,
  project: projectRouter,
  evidence: evidenceRouter,
  provider: providerRouter,
  mcpServer: mcpServerRouter,
  sprint: sprintRouter,
  moneyRules: moneyRulesRouter,
  wtp: wtpRouter,
  artifact: artifactRouter,
  pack: packRouter,
});

export type AppRouter = typeof appRouter;
