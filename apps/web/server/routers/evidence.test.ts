import { insertProject, insertUser, insertWorkspace, insertWorkspaceMembership } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext } from '../test/context';
import { sql } from '../test/harness';

describe('evidence procedures', () => {
  it('creates an upload intent and confirms after the object is stored', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `ev-${randomUUID()}@example.com`,
    });
    const createdWorkspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const ctx = await createTestContext(sql, user);
    const caller = appRouter.createCaller(ctx);
    const project = await caller.project.create({
      workspaceId: createdWorkspace.id,
      name: 'Venture',
      idempotencyKey: randomUUID(),
    });

    const intent = await caller.evidence.createUploadIntent({
      projectId: project.id,
      filename: 'notes.txt',
      mimeType: 'text/plain',
      sizeBytes: 12,
      idempotencyKey: randomUUID(),
    });
    expect(intent.uploadUrl).toContain('memory://');
    expect(intent.sourceId).toBeTruthy();

    const listedPending = await caller.evidence.list({ projectId: project.id });
    expect(listedPending).toHaveLength(1);
    const source = listedPending[0];
    if (source === undefined || source.s3Key === null) {
      throw new Error('expected a pending source with an s3 key');
    }
    await ctx.objectStore.put(source.s3Key, Buffer.from('hello evidence'), 'text/plain');

    const confirmed = await caller.evidence.confirmUpload({
      sourceId: intent.sourceId,
      idempotencyKey: randomUUID(),
    });
    expect(confirmed.status).toBe('uploaded');
    expect(ctx.jobQueue).toMatchObject({ jobs: [{ sourceId: intent.sourceId }] });
  });

  it('rejects upload without a session', async () => {
    const caller = appRouter.createCaller(await createTestContext(sql, null));
    await expect(
      caller.evidence.createUploadIntent({
        projectId: '11111111-1111-4111-8111-111111111111',
        filename: 'notes.txt',
        mimeType: 'text/plain',
        sizeBytes: 12,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      cause: { code: 'unauthorized' },
    });
  });

  it('forbids a viewer from uploading evidence', async () => {
    const owner = await insertUser(sql, {
      name: 'Owner',
      email: `owner-${randomUUID()}@example.com`,
    });
    const viewer = await insertUser(sql, {
      name: 'Viewer',
      email: `viewer-${randomUUID()}@example.com`,
    });
    const workspace = await insertWorkspace(sql, {
      name: 'Acme',
      ownerUserId: owner.id,
    });
    await insertWorkspaceMembership(sql, {
      workspaceId: workspace.id,
      userId: owner.id,
      role: 'owner',
    });
    await insertWorkspaceMembership(sql, {
      workspaceId: workspace.id,
      userId: viewer.id,
      role: 'viewer',
    });
    const project = await insertProject(sql, {
      workspaceId: workspace.id,
      name: 'Venture',
    });

    const caller = appRouter.createCaller(await createTestContext(sql, viewer));
    await expect(
      caller.evidence.createUploadIntent({
        projectId: project.id,
        filename: 'notes.txt',
        mimeType: 'text/plain',
        sizeBytes: 12,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      cause: { code: 'policy_forbidden' },
    });

    const listed = await caller.evidence.list({ projectId: project.id });
    expect(listed).toEqual([]);
  });
});
