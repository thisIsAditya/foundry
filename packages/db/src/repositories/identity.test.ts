import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { insertNotificationEndpoint } from '../repositories/notification-endpoints.js';
import { insertProjectMembership } from '../repositories/project-memberships.js';
import { getProjectById, insertProject } from '../repositories/projects.js';
import { getUserById, insertUser } from '../repositories/users.js';
import { insertWorkspaceMembership } from '../repositories/workspace-memberships.js';
import { getWorkspaceById, insertWorkspace } from '../repositories/workspaces.js';
import { sql } from '../test/harness.js';

describe('identity repositories', () => {
  it('round-trips a user through insert and get', async () => {
    const created = await insertUser(sql, {
      name: 'Ada',
      email: `ada-${randomUUID()}@example.com`,
      role: 'founder',
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
    });
    const loaded = await getUserById(sql, created.id);
    expect(loaded).toEqual(created);
    expect(created.emailVerified).toBe(false);
  });

  it('round-trips workspace, membership, project, and notification endpoint', async () => {
    const owner = await insertUser(sql, {
      name: 'Owner',
      email: `owner-${randomUUID()}@example.com`,
    });
    const member = await insertUser(sql, {
      name: 'Member',
      email: `member-${randomUUID()}@example.com`,
    });

    const workspace = await insertWorkspace(sql, {
      name: 'Acme',
      ownerUserId: owner.id,
    });
    expect(await getWorkspaceById(sql, workspace.id)).toEqual(workspace);
    expect(workspace.plan).toBe('free');
    expect(workspace.status).toBe('active');

    const membership = await insertWorkspaceMembership(sql, {
      workspaceId: workspace.id,
      userId: member.id,
      role: 'member',
      invitedBy: owner.id,
    });
    expect(membership.role).toBe('member');

    const project = await insertProject(sql, {
      workspaceId: workspace.id,
      name: 'Venture',
      description: 'First journey',
    });
    expect(await getProjectById(sql, project.id)).toEqual(project);
    expect(project.currentPhase).toBe('diagnose');
    expect(project.founderObjective).toBe('undecided');
    expect(project.currentPackRevisionId).toBeNull();

    const projectMembership = await insertProjectMembership(sql, {
      projectId: project.id,
      userId: member.id,
      roleOverride: 'viewer',
    });
    expect(projectMembership.roleOverride).toBe('viewer');

    const endpoint = await insertNotificationEndpoint(sql, {
      userId: owner.id,
      workspaceId: workspace.id,
      channel: 'email',
      target: owner.email,
    });
    expect(endpoint.revokedAt).toBeNull();
  });
});
