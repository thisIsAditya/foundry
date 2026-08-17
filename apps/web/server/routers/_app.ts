import { approvalRouter } from './approval';
import { artifactRouter } from './artifact';
import { conversationRouter } from './conversation';
import { decisionRouter } from './decision';
import { evidenceRouter } from './evidence';
import { founderTaskRouter } from './founder-task';
import { integrationRouter } from './integration';
import { jobRouter } from './job';
import { mcpServerRouter } from './mcp-server';
import { gateRouter, metricRouter } from './metric';
import { memberRouter } from './member';
import { moneyRulesRouter } from './money-rules';
import { packRouter } from './pack';
import { projectRouter } from './project';
import { providerRouter } from './provider';
import { scoreRouter } from './score';
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
  job: jobRouter,
  moneyRules: moneyRulesRouter,
  wtp: wtpRouter,
  artifact: artifactRouter,
  pack: packRouter,
  conversation: conversationRouter,
  founderTask: founderTaskRouter,
  score: scoreRouter,
  approval: approvalRouter,
  decision: decisionRouter,
  metric: metricRouter,
  gate: gateRouter,
  integration: integrationRouter,
  member: memberRouter,
});

export type AppRouter = typeof appRouter;
