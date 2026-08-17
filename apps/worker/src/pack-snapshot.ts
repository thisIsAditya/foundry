import type { PackSnapshot } from '@foundry/agent-runtime';
import {
  getCurrentMoneyRules,
  getPackRevisionById,
  listBeachheadsByPackRevisionId,
  listDmusByPackRevisionId,
  listInterviewsByProjectId,
  listMarketModelsByPackRevisionId,
  listQuotesByInterviewIds,
  listUnitEconomicsByPackRevisionId,
  listWtpEventsByProjectId,
  type Sql,
} from '@foundry/db';
import type { Project } from '@foundry/domain';
import { z } from 'zod';

const ClarificationSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(1),
  answeredAt: z.string().min(1),
});

const ProposedChangesSchema = z.object({
  clarifications: z.array(ClarificationSchema).default([]),
});

function readClarifications(proposedChanges: unknown): z.infer<typeof ClarificationSchema>[] {
  const parsed = ProposedChangesSchema.safeParse(proposedChanges);
  return parsed.success ? parsed.data.clarifications : [];
}

export async function loadPackSnapshot(sql: Sql, project: Project): Promise<PackSnapshot> {
  const packId = project.currentPackRevisionId;
  if (packId === null) {
    throw new Error('project has no pack revision');
  }
  const pack = await getPackRevisionById(sql, packId);
  if (pack === null || pack.projectId !== project.id) {
    throw new Error('pack revision not found');
  }
  const interviews = await listInterviewsByProjectId(sql, project.id);
  const quotes = await listQuotesByInterviewIds(
    sql,
    interviews.map((item) => item.id),
  );
  const beachheads = await listBeachheadsByPackRevisionId(sql, pack.id);
  const dmus = await listDmusByPackRevisionId(sql, pack.id);
  const moneyRules = await getCurrentMoneyRules(sql, project.id);
  const marketModels = await listMarketModelsByPackRevisionId(sql, pack.id);
  const unitEconomics = await listUnitEconomicsByPackRevisionId(sql, pack.id);
  const wtpEvents = await listWtpEventsByProjectId(sql, project.id);
  return {
    pack,
    phase: project.currentPhase,
    interviews,
    quotes,
    beachheads,
    dmus,
    moneyRules,
    marketModels,
    unitEconomics,
    wtpEvents,
    clarifications: readClarifications(pack.proposedChanges),
  };
}
