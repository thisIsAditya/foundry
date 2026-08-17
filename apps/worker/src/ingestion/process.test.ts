import { randomUUID } from 'node:crypto';

import {
  getSourceById,
  insertProject,
  insertSource,
  insertUser,
  insertWorkspace,
} from '@foundry/db';
import { EICAR_SIGNATURE } from '@foundry/document-intelligence';
import { SourceIdSchema } from '@foundry/domain';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { afterAll, describe, expect, it } from 'vitest';

import { processIngestionJob, searchIngestedBlocks } from './process.js';
import { startIngestionWorker } from '../queues/ingestion.worker.js';
import { createMemoryObjectStore } from '../storage/object-store.js';
import { sql } from '../test/harness.js';

async function seedUpload(filename: string, mimeType: string, body: Buffer) {
  const owner = await insertUser(sql, {
    name: 'Owner',
    email: `ing-${randomUUID()}@example.com`,
  });
  const workspace = await insertWorkspace(sql, {
    name: 'Acme',
    ownerUserId: owner.id,
  });
  const project = await insertProject(sql, {
    workspaceId: workspace.id,
    name: 'Venture',
  });
  const sourceId = SourceIdSchema.parse(randomUUID());
  const s3Key = `${workspace.id}/${project.id}/${sourceId}/${filename}`;
  const source = await insertSource(sql, {
    id: sourceId,
    projectId: project.id,
    kind: 'upload',
    status: 'uploaded',
    originalFilename: filename,
    mimeType,
    sizeBytes: body.byteLength,
    s3Key,
    createdByUserId: owner.id,
  });
  const objectStore = createMemoryObjectStore();
  await objectStore.put(s3Key, body, mimeType);
  return { workspace, project, source, objectStore };
}

describe('ingestion processor', () => {
  it('writes content blocks that full-text search can find', async () => {
    const body = Buffer.from('Unique pineapple evidence for retrieval');
    const seeded = await seedUpload('notes.txt', 'text/plain', body);
    await processIngestionJob(
      {
        sourceId: seeded.source.id,
        projectId: seeded.project.id,
        workspaceId: seeded.workspace.id,
        correlationId: randomUUID(),
      },
      { sql, objectStore: seeded.objectStore },
    );

    const source = await getSourceById(sql, seeded.source.id);
    expect(source?.status).toBe('ready');
    const hits = await searchIngestedBlocks(
      sql,
      seeded.workspace.id,
      seeded.project.id,
      'pineapple',
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.locator.sourceSnapshotId).toBeTruthy();
  });

  it('marks the source failed when malware is detected', async () => {
    const seeded = await seedUpload('eicar.txt', 'text/plain', Buffer.from(EICAR_SIGNATURE));
    await processIngestionJob(
      {
        sourceId: seeded.source.id,
        projectId: seeded.project.id,
        workspaceId: seeded.workspace.id,
        correlationId: randomUUID(),
      },
      { sql, objectStore: seeded.objectStore },
    );
    const source = await getSourceById(sql, seeded.source.id);
    expect(source?.status).toBe('failed');
    expect(source?.failureReason).toBe('malware_detected');
  });
});

describe('ingestion BullMQ worker', () => {
  const redisUrl = 'redis://localhost:6379';
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

  afterAll(async () => {
    await connection.quit();
  });

  it('consumes a job end to end', async () => {
    const body = Buffer.from('BullMQ ingested this unique kumquat document');
    const seeded = await seedUpload('queue.txt', 'text/plain', body);
    const queueName = `ingestion-test-${randomUUID()}`;
    const queue = new Queue(queueName, { connection });
    const worker = startIngestionWorker({
      sql,
      connection,
      objectStore: seeded.objectStore,
      queueName,
    });

    try {
      await queue.add(
        'ingest',
        {
          sourceId: seeded.source.id,
          projectId: seeded.project.id,
          workspaceId: seeded.workspace.id,
          correlationId: randomUUID(),
        },
        { jobId: `ingestion-${seeded.source.id}` },
      );

      await expect
        .poll(async () => (await getSourceById(sql, seeded.source.id))?.status, {
          timeout: 15_000,
          interval: 100,
        })
        .toBe('ready');
    } finally {
      await worker.close();
      await queue.obliterate({ force: true });
      await queue.close();
    }
  });
});
