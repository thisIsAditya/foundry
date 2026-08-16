import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { insertProject, listProjects } from '../repositories/projects.js';
import { insertUser } from '../repositories/users.js';
import { insertWorkspace, listWorkspaces } from '../repositories/workspaces.js';
import { withWorkspaceScope } from '../rls.js';
import { sql } from './harness.js';

describe('RLS tenant isolation', () => {
  it('hides another workspace project when the session is scoped to workspace A', async () => {
    const ownerA = await insertUser(sql, {
      name: 'Owner A',
      email: `a-${randomUUID()}@example.com`,
    });
    const ownerB = await insertUser(sql, {
      name: 'Owner B',
      email: `b-${randomUUID()}@example.com`,
    });
    const workspaceA = await insertWorkspace(sql, {
      name: 'Workspace A',
      ownerUserId: ownerA.id,
    });
    const workspaceB = await insertWorkspace(sql, {
      name: 'Workspace B',
      ownerUserId: ownerB.id,
    });
    const projectA = await insertProject(sql, {
      workspaceId: workspaceA.id,
      name: 'Project A',
    });
    await insertProject(sql, {
      workspaceId: workspaceB.id,
      name: 'Project B',
    });

    const visible = await withWorkspaceScope(sql, [workspaceA.id], async (tx) => {
      return listProjects(tx);
    });

    expect(visible.map((project) => project.id)).toEqual([projectA.id]);
    expect(visible.map((project) => project.name)).toEqual(['Project A']);
  });

  it('returns no workspaces when the session scope is empty', async () => {
    const owner = await insertUser(sql, {
      name: 'Owner',
      email: `empty-${randomUUID()}@example.com`,
    });
    await insertWorkspace(sql, {
      name: 'Hidden',
      ownerUserId: owner.id,
    });

    const visible = await withWorkspaceScope(sql, [], async (tx) => listWorkspaces(tx));
    expect(visible).toEqual([]);
  });
});
