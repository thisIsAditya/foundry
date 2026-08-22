import { cofounderRouter } from './cofounder';
import { conversationRouter } from './conversation';
import { decisionRouter } from './decision';
import { evidenceRouter } from './evidence';
import { journeyRouter } from './journey';
import { memberRouter } from './member';
import { projectRouter } from './project';
import { proposalRouter } from './proposal';
import { recordRouter } from './record';
import { workspaceRouter } from './workspace';
import { router } from '../trpc';

export const appRouter = router({
  workspace: workspaceRouter,
  project: projectRouter,
  evidence: evidenceRouter,
  conversation: conversationRouter,
  decision: decisionRouter,
  member: memberRouter,
  journey: journeyRouter,
  record: recordRouter,
  proposal: proposalRouter,
  cofounder: cofounderRouter,
});

export type AppRouter = typeof appRouter;
