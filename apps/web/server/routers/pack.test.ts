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

  it('returns all 17 business model cards without throwing when backing rows are empty', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `pack-agg-${randomUUID()}@example.com`,
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
    const sections = await caller.pack.listBusinessModelSections({ projectId: project.id });
    expect(sections).toHaveLength(17);
    expect(new Set(sections.map((item) => item.key)).size).toBe(17);
    for (const section of sections) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.summary.length).toBeGreaterThan(0);
      expect(section.knownFacts).toBeDefined();
      expect(section.assumptions).toBeDefined();
      expect(section.citations).toBeDefined();
      expect([
        'draft',
        'assumption_heavy',
        'researching',
        'needs_founder',
        'supported',
        'stale',
        'blocked',
        'accepted',
      ]).toContain(section.status);
    }
    const problem = await caller.pack.getBusinessModelSection({
      projectId: project.id,
      key: 'problem',
    });
    expect(problem.card.key).toBe('problem');
    expect(problem.revisionHistory.length).toBeGreaterThan(0);
  });

  it('exposes revisions and accepts a single safe section', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `pack-sec-${randomUUID()}@example.com`,
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
    const revisionId = project.currentPackRevisionId;
    if (revisionId === null) {
      throw new Error('expected a current pack revision');
    }
    const revisions = await caller.pack.listRevisions({ projectId: project.id });
    expect(revisions.some((item) => item.id === revisionId)).toBe(true);

    const accepted = await caller.pack.acceptSection({
      projectId: project.id,
      revisionId,
      expectedRevision: revisionId,
      sectionKey: 'problem',
      idempotencyKey: randomUUID(),
    });
    expect(accepted.id).toBe(revisionId);
    const problem = await caller.pack.getBusinessModelSection({
      projectId: project.id,
      key: 'problem',
    });
    expect(problem.card.status).toBe('accepted');

    const replayKey = randomUUID();
    const first = await caller.pack.acceptAllSafeSections({
      projectId: project.id,
      revisionId,
      expectedRevision: revisionId,
      idempotencyKey: replayKey,
    });
    const replayed = await caller.pack.acceptAllSafeSections({
      projectId: project.id,
      revisionId,
      expectedRevision: revisionId,
      idempotencyKey: replayKey,
    });
    expect(replayed.revision.id).toBe(first.revision.id);
    expect(first.skippedUnsafeKeys).toContain('business_model_money_rules');

    const explained = await caller.pack.explainChange({
      projectId: project.id,
      revisionId,
      sectionKey: 'problem',
    });
    expect(explained.explanation.length).toBeGreaterThan(0);
  });
});
