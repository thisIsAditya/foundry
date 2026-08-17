import { randomUUID } from 'node:crypto';

import type { AgentRunOutput } from '@foundry/agent-runtime';
import {
  getPackRevisionById,
  getPackSection,
  insertBeachhead,
  insertDmu,
  insertPackRevision,
  insertProject,
  insertUser,
  insertWorkspace,
  listBeachheadsByPackRevisionId,
  listDmusByPackRevisionId,
  updateBeachheadDmuId,
  updateProjectCurrentPackRevision,
  upsertPackSection,
  withWorkspaceScope,
} from '@foundry/db';
import { SprintIdSchema } from '@foundry/domain';
import { describe, expect, it } from 'vitest';

import { sql } from '../test/harness.js';
import { proposePackRevisionFromSynthesis } from './propose-pack-revision.js';

function synthesis(overrides: Partial<AgentRunOutput> = {}): AgentRunOutput {
  return {
    result: 'Two qualifying interviews point at the same nightly-close pain.',
    proposedPackChanges: [],
    evidenceRefs: [],
    assumptionsChanged: [],
    unresolvedConflicts: [],
    confidence: 'medium',
    recommendedNextAction: 'Capture one more interview.',
    ...overrides,
  };
}

async function seedProjectWithPack() {
  const owner = await insertUser(sql, {
    name: 'Owner',
    email: `propose-${randomUUID()}@example.com`,
  });
  const workspace = await insertWorkspace(sql, { name: 'Acme', ownerUserId: owner.id });
  const project = await insertProject(sql, { workspaceId: workspace.id, name: 'Venture' });
  const pack = await insertPackRevision(sql, {
    projectId: project.id,
    revisionNumber: 1,
    actorType: 'founder',
    actorId: owner.id,
    proposedChanges: { clarifications: [] },
  });
  await updateProjectCurrentPackRevision(sql, project.id, pack.id);
  return { owner, workspace, project, pack };
}

describe('proposePackRevisionFromSynthesis', () => {
  it('returns null when the synthesis proposes no pack changes', async () => {
    const { workspace, project, pack } = await seedProjectWithPack();
    const revisionId = await withWorkspaceScope(sql, [workspace.id], async (tx) =>
      proposePackRevisionFromSynthesis(tx, {
        projectId: project.id,
        parentPackRevisionId: pack.id,
        sprintId: SprintIdSchema.parse(randomUUID()),
        synthesis: synthesis(),
      }),
    );
    expect(revisionId).toBeNull();
  });

  it('drafts a copy-on-write revision with the change applied and does not mutate the parent', async () => {
    const { workspace, project, pack } = await seedProjectWithPack();
    await withWorkspaceScope(sql, [workspace.id], async (tx) =>
      upsertPackSection(tx, {
        packRevisionId: pack.id,
        section: 'mvbp',
        body: {
          hypothesis: 'Founders waste an hour a day on nightly reconciliation.',
          capability: 'Automated nightly close',
          timeBoxDays: null,
          featureCount: 1,
          paymentPath: null,
          outOfScope: [],
          killLines: [],
          founderAssertions: [],
        },
      }),
    );
    const beachhead = await withWorkspaceScope(sql, [workspace.id], async (tx) =>
      insertBeachhead(tx, {
        packRevisionId: pack.id,
        segmentDefinition: 'Solo bookkeepers in India',
      }),
    );
    const dmu = await withWorkspaceScope(sql, [workspace.id], async (tx) =>
      insertDmu(tx, { packRevisionId: pack.id, beachheadId: beachhead.id, buyer: 'Owner' }),
    );
    await withWorkspaceScope(sql, [workspace.id], async (tx) =>
      updateBeachheadDmuId(tx, beachhead.id, dmu.id),
    );

    const sprintId = SprintIdSchema.parse(randomUUID());
    const revisionId = await withWorkspaceScope(sql, [workspace.id], async (tx) =>
      proposePackRevisionFromSynthesis(tx, {
        projectId: project.id,
        parentPackRevisionId: pack.id,
        sprintId,
        synthesis: synthesis({
          proposedPackChanges: [
            {
              targetSection: 'mvbp',
              body: { hypothesis: 'Automate the nightly close for solo bookkeepers.' },
            },
          ],
        }),
      }),
    );
    expect(revisionId).not.toBeNull();

    const draft = await withWorkspaceScope(sql, [workspace.id], async (tx) =>
      revisionId === null ? null : getPackRevisionById(tx, revisionId),
    );
    expect(draft?.status).toBe('draft');
    expect(draft?.sourceSprintId).toBe(sprintId);
    expect(draft?.parentRevisionId).toBe(pack.id);
    expect(draft?.actorType).toBe('agent');

    const draftSection = await withWorkspaceScope(sql, [workspace.id], async (tx) =>
      revisionId === null ? null : getPackSection(tx, revisionId, 'mvbp'),
    );
    expect(draftSection?.body).toMatchObject({
      hypothesis: 'Automate the nightly close for solo bookkeepers.',
      capability: 'Automated nightly close',
    });

    const parentSection = await withWorkspaceScope(sql, [workspace.id], async (tx) =>
      getPackSection(tx, pack.id, 'mvbp'),
    );
    expect(parentSection?.body).toMatchObject({
      hypothesis: 'Founders waste an hour a day on nightly reconciliation.',
    });

    const draftBeachheads = await withWorkspaceScope(sql, [workspace.id], async (tx) =>
      revisionId === null ? [] : listBeachheadsByPackRevisionId(tx, revisionId),
    );
    expect(draftBeachheads).toHaveLength(1);
    expect(draftBeachheads[0]?.segmentDefinition).toBe('Solo bookkeepers in India');
    expect(draftBeachheads[0]?.id).not.toBe(beachhead.id);

    const draftDmus = await withWorkspaceScope(sql, [workspace.id], async (tx) =>
      revisionId === null ? [] : listDmusByPackRevisionId(tx, revisionId),
    );
    expect(draftDmus).toHaveLength(1);
    expect(draftDmus[0]?.buyer).toBe('Owner');
    expect(draftDmus[0]?.beachheadId).toBe(draftBeachheads[0]?.id);
    expect(draftDmus[0]?.id).not.toBe(dmu.id);
    expect(draftBeachheads[0]?.dmuId).toBe(draftDmus[0]?.id);
  });
});
