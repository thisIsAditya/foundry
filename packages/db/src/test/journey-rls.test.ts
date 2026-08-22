import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { insertJourney, getJourneyByProjectId } from '../repositories/journeys.js';
import { listRecordItemsByProjectId } from '../repositories/record-items.js';
import { insertProject, listProjects } from '../repositories/projects.js';
import { insertUser } from '../repositories/users.js';
import { insertWorkspace } from '../repositories/workspaces.js';
import { withWorkspaceScope } from '../rls.js';
import { sql } from './harness.js';

describe('V4 journey conversion and RLS', () => {
  it('creates one authoritative journey per project', async () => {
    const owner = await insertUser(sql, {
      name: 'Owner',
      email: `v4-${randomUUID()}@example.com`,
    });
    const workspace = await insertWorkspace(sql, {
      name: 'Workspace',
      ownerUserId: owner.id,
    });
    const project = await insertProject(sql, {
      workspaceId: workspace.id,
      name: 'Legacy venture',
      currentPhase: 'diagnose',
    });

    const journey = await withWorkspaceScope(sql, [workspace.id], async (tx) =>
      insertJourney(tx, {
        projectId: project.id,
        workspaceId: workspace.id,
        currentStage: 'idea',
        currentObjective: 'Capture the idea in the founder’s own words.',
      }),
    );
    expect(journey.currentStage).toBe('idea');
    expect(journey.projectId).toBe(project.id);
  });

  it('hides another workspace journey and refuses ownership updates', async () => {
    const ownerA = await insertUser(sql, {
      name: 'Owner A',
      email: `v4a-${randomUUID()}@example.com`,
    });
    const ownerB = await insertUser(sql, {
      name: 'Owner B',
      email: `v4b-${randomUUID()}@example.com`,
    });
    const workspaceA = await insertWorkspace(sql, {
      name: 'A',
      ownerUserId: ownerA.id,
    });
    const workspaceB = await insertWorkspace(sql, {
      name: 'B',
      ownerUserId: ownerB.id,
    });
    const projectA = await insertProject(sql, {
      workspaceId: workspaceA.id,
      name: 'A',
    });
    const projectB = await insertProject(sql, {
      workspaceId: workspaceB.id,
      name: 'B',
    });

    await withWorkspaceScope(sql, [workspaceA.id], async (tx) => {
      await insertJourney(tx, {
        projectId: projectA.id,
        workspaceId: workspaceA.id,
        currentStage: 'idea',
        currentObjective: 'Capture the idea.',
      });
    });
    await withWorkspaceScope(sql, [workspaceB.id], async (tx) => {
      await insertJourney(tx, {
        projectId: projectB.id,
        workspaceId: workspaceB.id,
        currentStage: 'problem',
        currentObjective: 'Frame the problem.',
      });
    });

    const visible = await withWorkspaceScope(sql, [workspaceA.id], async (tx) => ({
      journeys: await tx<{ id: string }[]>`select id from journeys`,
      items: await listRecordItemsByProjectId(tx, projectB.id),
      hiddenJourney: await getJourneyByProjectId(tx, projectB.id),
      projects: await listProjects(tx),
    }));
    expect(visible.hiddenJourney).toBeNull();
    expect(visible.items).toEqual([]);
    expect(visible.journeys).toHaveLength(1);
    expect(visible.projects.map((project) => project.id)).toEqual([projectA.id]);

    const stolen = await withWorkspaceScope(sql, [workspaceA.id], async (tx) => {
      return tx<{ id: string }[]>`
        update journeys
        set workspace_id = ${workspaceA.id}
        where project_id = ${projectB.id}
        returning id
      `;
    });
    expect(stolen).toEqual([]);
  });
});
