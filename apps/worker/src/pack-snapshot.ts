import type { PackSnapshot } from '@foundry/agent-runtime';
import {
  getCurrentMoneyRules,
  getPackRevisionById,
  getPendingDraftRevisionByParentId,
  listAssumptionsByProjectId,
  listBeachheadsByPackRevisionId,
  listDecisionsByProjectId,
  listDmusByPackRevisionId,
  listInterviewsByProjectId,
  listMarketModelsByPackRevisionId,
  listPackSections,
  listPersonasByPackRevisionId,
  listProblemsByPackRevisionId,
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

/** Worker-side mirror of `apps/web/server/services/pack-snapshot.ts` — kept in sync manually
 * since the worker doesn't depend on the web app's server services. */
export async function loadPackSnapshot(sql: Sql, project: Project): Promise<PackSnapshot> {
  const packId = project.currentPackRevisionId;
  if (packId === null) {
    throw new Error('project has no pack revision');
  }
  const pack = await getPackRevisionById(sql, packId);
  if (pack === null || pack.projectId !== project.id) {
    throw new Error('pack revision not found');
  }
  const [
    interviews,
    beachheads,
    dmus,
    personas,
    problems,
    moneyRules,
    marketModels,
    unitEconomics,
    wtpEvents,
    assumptions,
    decisions,
    packSections,
    pendingDraftRevision,
  ] = await Promise.all([
    listInterviewsByProjectId(sql, project.id),
    listBeachheadsByPackRevisionId(sql, pack.id),
    listDmusByPackRevisionId(sql, pack.id),
    listPersonasByPackRevisionId(sql, pack.id),
    listProblemsByPackRevisionId(sql, pack.id),
    getCurrentMoneyRules(sql, project.id),
    listMarketModelsByPackRevisionId(sql, pack.id),
    listUnitEconomicsByPackRevisionId(sql, pack.id),
    listWtpEventsByProjectId(sql, project.id),
    listAssumptionsByProjectId(sql, project.id),
    listDecisionsByProjectId(sql, project.id),
    listPackSections(sql, pack.id),
    getPendingDraftRevisionByParentId(sql, pack.id),
  ]);
  const quotes = await listQuotesByInterviewIds(
    sql,
    interviews.map((item) => item.id),
  );
  return {
    pack,
    pendingDraftRevision,
    phase: project.currentPhase,
    derivedPhase: null,
    interviews,
    quotes,
    beachheads,
    dmus,
    personas,
    problems,
    moneyRules,
    marketModels,
    unitEconomics,
    wtpEvents,
    assumptions,
    decisions,
    packSections,
    clarifications: readClarifications(pack.proposedChanges),
  };
}
