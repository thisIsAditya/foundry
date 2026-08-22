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

  it('captures interviews with quotes and lists quote counts', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `iv-${randomUUID()}@example.com`,
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

    const created = await caller.evidence.addInterview({
      projectId: project.id,
      participantType: 'non_friend',
      consent: { given: true },
      quotes: ['We waste hours reconciling invoices.', 'Nobody in our team owns this problem.'],
      idempotencyKey: randomUUID(),
    });
    expect(created.quotes).toHaveLength(2);
    expect(created.interview.participantType).toBe('non_friend');

    const listed = await caller.evidence.listInterviews({ projectId: project.id });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.quoteCount).toBe(2);
  });

  it('preserves friend and simulated interview provenance without treating it as validation', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `iv-gate-${randomUUID()}@example.com`,
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

    await caller.evidence.addInterview({
      projectId: project.id,
      participantType: 'friend',
      consent: { given: true },
      quotes: ['Sounds like a great idea!'],
      idempotencyKey: randomUUID(),
    });
    await caller.evidence.addInterview({
      projectId: project.id,
      participantType: 'non_friend',
      consent: { given: true, simulated: true },
      quotes: ['I would probably use this.'],
      idempotencyKey: randomUUID(),
    });

    const listed = await caller.evidence.listInterviews({ projectId: project.id });
    expect(listed).toHaveLength(2);
  });

  it('records a field observation as an evidence item', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `obs-${randomUUID()}@example.com`,
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
    const item = await caller.evidence.recordObservation({
      projectId: project.id,
      summary: 'Cafe owners mentioned weekend staffing pain.',
      sectionKey: 'problem',
      idempotencyKey: randomUUID(),
    });
    expect(item.summary).toContain('weekend staffing');
    const library = await caller.evidence.listLibrary({ projectId: project.id, filter: 'sources' });
    expect(library.some((entry) => entry.id === item.id)).toBe(true);
  });

  it('lists interviews separately from sources in the evidence library', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `lib-${randomUUID()}@example.com`,
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
    const saved = await caller.evidence.addInterview({
      projectId: project.id,
      participantType: 'known_contact',
      consent: { given: false },
      quotes: ['We lose two hours closing the books.'],
      idempotencyKey: randomUUID(),
    });
    const interviews = await caller.evidence.listLibrary({
      projectId: project.id,
      filter: 'interviews',
    });
    expect(interviews.some((entry) => entry.id === saved.interview.id)).toBe(true);
  });

  it('extracts three interview candidates and never infers consent as true', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `import-${randomUUID()}@example.com`,
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
    const started = await caller.evidence.startInterviewImport({
      projectId: project.id,
      text: `Interview 1
Cafe owner in Pune.
> We lose two hours closing the books.

---
Interview 2
participant type: friend
> I would not pay for this.

---
Interview 3
consent: yes
> The reconciling is the painful part.`,
      idempotencyKey: randomUUID(),
    });
    expect(started.candidates).toHaveLength(3);
    expect(started.candidates.every((item) => item.consentGiven === false)).toBe(true);
    expect(started.batch.classification).toBe('interview_bundle');

    const replayKey = randomUUID();
    const firstDecide = await caller.evidence.decideInterviewImport({
      projectId: project.id,
      batchId: started.batch.id,
      acceptIds: [started.candidates[0]!.id, started.candidates[1]!.id],
      rejectIds: [started.candidates[2]!.id],
      idempotencyKey: replayKey,
    });
    expect(firstDecide).toEqual({ created: 2, rejected: 1, duplicates: 0 });
    const replayed = await caller.evidence.decideInterviewImport({
      projectId: project.id,
      batchId: started.batch.id,
      acceptIds: [started.candidates[0]!.id, started.candidates[1]!.id],
      rejectIds: [started.candidates[2]!.id],
      idempotencyKey: replayKey,
    });
    expect(replayed).toEqual(firstDecide);
    const listed = await caller.evidence.listInterviews({ projectId: project.id });
    expect(listed).toHaveLength(2);
    expect(
      listed.every((item) => {
        const consent = item.interview.consent;
        return !(
          typeof consent === 'object' &&
          consent !== null &&
          'given' in consent &&
          consent.given === true
        );
      }),
    ).toBe(true);
  });

  it('lets the founder inspect, edit, and delete project memory', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `mem-${randomUUID()}@example.com`,
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
    const created = await caller.evidence.upsertMemory({
      projectId: project.id,
      kind: 'constraint',
      body: 'Do not treat friend interviews as independent proof.',
      idempotencyKey: randomUUID(),
    });
    expect(created.body).toContain('friend interviews');
    const listed = await caller.evidence.listMemory({ projectId: project.id });
    expect(listed).toHaveLength(1);
    await caller.evidence.deleteMemory({
      projectId: project.id,
      id: created.id,
      idempotencyKey: randomUUID(),
    });
    expect(await caller.evidence.listMemory({ projectId: project.id })).toHaveLength(0);
  });
});
