import {
  getCurrentMoneyRules,
  getPackRevisionById,
  getPendingDraftRevisionByParentId,
  insertPackRevision,
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
  updateProjectCurrentPackRevision,
  type Sql,
} from '@foundry/db';
import type { PackSnapshot } from '@foundry/agent-runtime';
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

export async function ensurePackRevision(sql: Sql, project: Project, actorId: string) {
  if (project.currentPackRevisionId !== null) {
    const existing = await getPackRevisionById(sql, project.currentPackRevisionId);
    if (existing !== null) {
      return existing;
    }
  }
  const created = await insertPackRevision(sql, {
    projectId: project.id,
    revisionNumber: 1,
    actorType: 'founder',
    actorId,
    proposedChanges: { clarifications: [] },
  });
  await updateProjectCurrentPackRevision(sql, project.id, created.id);
  return created;
}

export function readClarifications(
  proposedChanges: unknown,
): z.infer<typeof ClarificationSchema>[] {
  const parsed = ProposedChangesSchema.safeParse(proposedChanges);
  return parsed.success ? parsed.data.clarifications : [];
}

/**
 * Loads the full plan-state snapshot the context assembler needs (agent-runtime's
 * `PackSnapshot`): the accepted pack revision, any pending draft on top of it, and every
 * evidence/plan entity keyed off either the pack revision or the project. Shared by chat
 * (`ConversationService`), sprint preview, and the initial-draft/desk-summary read paths.
 */
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
