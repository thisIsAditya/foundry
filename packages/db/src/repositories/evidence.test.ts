import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { insertContentBlock, searchContentBlocks } from './content-blocks.js';
import { insertDocument, updateDocumentLatestSnapshot } from './documents.js';
import { insertProject } from './projects.js';
import { insertSourceSnapshot } from './source-snapshots.js';
import { insertSource, listSourcesByProjectId } from './sources.js';
import { insertUser } from './users.js';
import { insertWorkspace } from './workspaces.js';
import { withWorkspaceScope } from '../rls.js';
import { sql } from '../test/harness.js';

async function seedProject(name: string) {
  const owner = await insertUser(sql, {
    name: `${name} owner`,
    email: `${name.replaceAll(/\s+/g, '-').toLowerCase()}-${randomUUID()}@example.com`,
  });
  const workspace = await insertWorkspace(sql, {
    name,
    ownerUserId: owner.id,
  });
  const project = await insertProject(sql, {
    workspaceId: workspace.id,
    name,
  });
  return { owner, workspace, project };
}

describe('evidence repositories', () => {
  it('round-trips a source, snapshot, document, and searchable text block', async () => {
    const { owner, project } = await seedProject('Evidence');
    const source = await insertSource(sql, {
      projectId: project.id,
      kind: 'upload',
      status: 'ready',
      originalFilename: 'notes.txt',
      mimeType: 'text/plain',
      createdByUserId: owner.id,
    });
    const snapshot = await insertSourceSnapshot(sql, {
      sourceId: source.id,
      contentHash: 'abc123',
      parserMetadata: { parser: 'text' },
    });
    const document = await insertDocument(sql, {
      sourceId: source.id,
      title: 'notes',
    });
    await updateDocumentLatestSnapshot(sql, document.id, snapshot.id, 'notes');
    await insertContentBlock(sql, {
      documentId: document.id,
      sourceSnapshotId: snapshot.id,
      blockType: 'text',
      sequenceNo: 0,
      textContent: 'Unique pineapple evidence for full-text search',
      locator: { sourceSnapshotId: snapshot.id, paragraph: 0 },
    });

    const hits = await searchContentBlocks(sql, project.id, 'pineapple');
    expect(hits).toHaveLength(1);
    expect(hits[0]?.textContent).toContain('pineapple');
    expect(hits[0]?.locator.sourceSnapshotId).toBe(snapshot.id);
    expect(hits[0]?.rank).toBeGreaterThan(0);
  });

  it('hides another workspace source when the session is scoped to workspace A', async () => {
    const a = await seedProject('Workspace A');
    const b = await seedProject('Workspace B');
    await insertSource(sql, {
      projectId: a.project.id,
      kind: 'upload',
      originalFilename: 'a.txt',
    });
    const sourceB = await insertSource(sql, {
      projectId: b.project.id,
      kind: 'upload',
      originalFilename: 'b.txt',
    });

    const visibleA = await withWorkspaceScope(sql, [a.workspace.id], async (tx) => {
      return listSourcesByProjectId(tx, a.project.id);
    });
    const visibleBFromA = await withWorkspaceScope(sql, [a.workspace.id], async (tx) => {
      return listSourcesByProjectId(tx, b.project.id);
    });
    const visibleB = await withWorkspaceScope(sql, [b.workspace.id], async (tx) => {
      return listSourcesByProjectId(tx, b.project.id);
    });

    expect(visibleA).toHaveLength(1);
    expect(visibleBFromA).toEqual([]);
    expect(visibleB.map((source) => source.id)).toEqual([sourceB.id]);
  });
});
