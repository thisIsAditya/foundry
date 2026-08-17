import { insertPackRevision, insertUser, withWorkspaceScope } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext } from '../test/context';
import { sql } from '../test/harness';

describe('pack revision review path', () => {
  it('surfaces a pending draft revision on the desk and accepts it', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `pack-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const caller = appRouter.createCaller(await createTestContext(sql, user));
    const project = await caller.project.create({
      workspaceId: workspace.id,
      name: 'Venture',
      idempotencyKey: randomUUID(),
    });
    const baseline = project.currentPackRevisionId;
    expect(baseline).not.toBeNull();

    const before = await caller.project.getDeskSummary({ projectId: project.id });
    expect(before.pendingPackRevisionId).toBeNull();

    const draft = await withWorkspaceScope(sql, [workspace.id], async (tx) =>
      insertPackRevision(tx, {
        projectId: project.id,
        revisionNumber: 2,
        parentRevisionId: baseline,
        actorType: 'agent',
        proposedChanges: {},
      }),
    );

    const withDraft = await caller.project.getDeskSummary({ projectId: project.id });
    expect(withDraft.pendingPackRevisionId).toBe(draft.id);

    if (baseline === null) {
      throw new Error('expected a baseline pack revision');
    }
    const diff = await caller.pack.getDiff({
      projectId: project.id,
      fromRevision: baseline,
      toRevision: draft.id,
    });
    expect(diff.from).toEqual([]);
    expect(diff.to).toEqual([]);

    const accepted = await caller.pack.acceptRevision({
      projectId: project.id,
      revisionId: draft.id,
      expectedRevision: draft.id,
      idempotencyKey: randomUUID(),
    });
    expect(accepted.status).toBe('accepted');

    const after = await caller.project.getDeskSummary({ projectId: project.id });
    expect(after.pendingPackRevisionId).toBeNull();
    expect(after.packRevisionId).toBe(draft.id);
  });
});
