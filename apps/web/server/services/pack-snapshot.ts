import {
  getPackRevisionById,
  insertPackRevision,
  listBeachheadsByPackRevisionId,
  listDmusByPackRevisionId,
  listInterviewsByProjectId,
  listQuotesByInterviewIds,
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
  return {
    pack,
    phase: project.currentPhase,
    interviews,
    quotes,
    beachheads,
    dmus,
    clarifications: readClarifications(pack.proposedChanges),
  };
}
