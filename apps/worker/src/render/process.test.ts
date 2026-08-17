import { randomUUID } from 'node:crypto';

import {
  getArtifactVersionById,
  insertArtifact,
  insertArtifactVersion,
  insertCurrentMoneyRules,
  insertMarketModel,
  insertPackRevision,
  insertProject,
  insertRenderJob,
  insertUnitEconomicsModel,
  insertUser,
  insertWorkspace,
  updateProjectCurrentPackRevision,
} from '@foundry/db';
import { calculateMarketSize, calculateSensitivity, calculateUnitEconomics } from '@foundry/policy';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { afterAll, describe, expect, it } from 'vitest';

import { startRenderWorker } from '../queues/render.worker.js';
import { createMemoryObjectStore } from '../storage/object-store.js';
import { sql } from '../test/harness.js';
import { processRenderJob } from './process.js';

const costStructure = {
  cogs: '20',
  variableCostPerUnit: '5',
  cac: '150',
  lifetimePeriods: 24,
};

async function seedProject() {
  const owner = await insertUser(sql, {
    name: 'Owner',
    email: `render-${randomUUID()}@example.com`,
  });
  const workspace = await insertWorkspace(sql, {
    name: 'Acme',
    ownerUserId: owner.id,
  });
  const project = await insertProject(sql, {
    workspaceId: workspace.id,
    name: 'Cafe OS',
  });
  const pack = await insertPackRevision(sql, {
    projectId: project.id,
    revisionNumber: 1,
    actorType: 'founder',
    actorId: owner.id,
    proposedChanges: {
      clarifications: [
        {
          questionId: 'problem',
          answer: 'Books take too long',
          answeredAt: new Date().toISOString(),
        },
      ],
    },
  });
  await updateProjectCurrentPackRevision(sql, project.id, pack.id);
  return { workspace, project: { ...project, currentPackRevisionId: pack.id }, pack };
}

describe('render processor', () => {
  it('writes markdown, html, and pdf for a company pack', async () => {
    const seeded = await seedProject();
    const artifact = await insertArtifact(sql, {
      projectId: seeded.project.id,
      artifactType: 'company_pack',
    });
    const version = await insertArtifactVersion(sql, {
      artifactId: artifact.id,
      versionNumber: 1,
      packRevisionId: seeded.pack.id,
      s3Key: `artifacts/${seeded.project.id}/${artifact.id}/1.md`,
      status: 'generating',
    });
    await insertRenderJob(sql, { artifactVersionId: version.id });
    const objectStore = createMemoryObjectStore();
    await processRenderJob(
      {
        artifactVersionId: version.id,
        projectId: seeded.project.id,
        workspaceId: seeded.workspace.id,
        artifactType: 'company_pack',
        packRevisionId: seeded.pack.id,
        correlationId: randomUUID(),
      },
      { sql, objectStore },
    );
    const stored = await getArtifactVersionById(sql, version.id);
    expect(stored?.status).toBe('current');
    const markdown = await objectStore.get(version.s3Key);
    expect(markdown.toString('utf8')).toContain('Cafe OS');
    expect(markdown.toString('utf8')).toContain('Books take too long');
    const pdf = await objectStore.get(version.s3Key.replace(/\.md$/u, '.pdf'));
    expect(pdf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });

  it('writes an xlsx workbook from MoneyRules and calculator outputs', async () => {
    const seeded = await seedProject();
    const money = await insertCurrentMoneyRules(sql, {
      projectId: seeded.project.id,
      packRevisionId: seeded.pack.id,
      currency: 'INR',
      unitOfSale: 'seat-month',
      price: '99',
      billingFrequency: 'monthly',
      costStructure,
    });
    const inputs = {
      totalAccounts: '1000',
      servedAccounts: '200',
      beachheadAccounts: '20',
      unitsPerAccountPerPeriod: '1',
      captureRate: '0.25',
      currency: 'INR' as const,
    };
    await insertMarketModel(sql, {
      packRevisionId: seeded.pack.id,
      formulaSpec: { kind: 'bottom_up', periodsPerYear: 12 },
      inputs,
      computedResult: calculateMarketSize({
        spec: { kind: 'bottom_up', periodsPerYear: 12 },
        inputs,
        price: money.price,
      }),
    });
    const margin = calculateUnitEconomics({
      price: money.price,
      currency: money.currency,
      costStructure,
    });
    await insertUnitEconomicsModel(sql, {
      packRevisionId: seeded.pack.id,
      moneyRulesId: money.id,
      margin,
      sensitivity: calculateSensitivity({
        price: money.price,
        currency: money.currency,
        costStructure,
      }),
    });
    const artifact = await insertArtifact(sql, {
      projectId: seeded.project.id,
      artifactType: 'market_economics_workbook',
    });
    const version = await insertArtifactVersion(sql, {
      artifactId: artifact.id,
      versionNumber: 1,
      packRevisionId: seeded.pack.id,
      s3Key: `artifacts/${seeded.project.id}/${artifact.id}/1.xlsx`,
      status: 'generating',
    });
    const objectStore = createMemoryObjectStore();
    await processRenderJob(
      {
        artifactVersionId: version.id,
        projectId: seeded.project.id,
        workspaceId: seeded.workspace.id,
        artifactType: 'market_economics_workbook',
        packRevisionId: seeded.pack.id,
        correlationId: randomUUID(),
      },
      { sql, objectStore },
    );
    const xlsx = await objectStore.get(version.s3Key);
    expect(xlsx.subarray(0, 2).toString('utf8')).toBe('PK');
    expect((await getArtifactVersionById(sql, version.id))?.status).toBe('current');
  });
});

describe('render BullMQ worker', () => {
  const redisUrl = 'redis://localhost:6379';
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

  afterAll(async () => {
    await connection.quit();
  });

  it('consumes a job end to end', async () => {
    const seeded = await seedProject();
    const artifact = await insertArtifact(sql, {
      projectId: seeded.project.id,
      artifactType: 'one_page_brief',
    });
    const version = await insertArtifactVersion(sql, {
      artifactId: artifact.id,
      versionNumber: 1,
      packRevisionId: seeded.pack.id,
      s3Key: `artifacts/${seeded.project.id}/${artifact.id}/1.pdf`,
      status: 'generating',
    });
    await insertRenderJob(sql, { artifactVersionId: version.id });
    const objectStore = createMemoryObjectStore();
    const queueName = `render-test-${randomUUID()}`;
    const queue = new Queue(queueName, { connection });
    const worker = startRenderWorker({ sql, connection, objectStore, queueName });
    try {
      await queue.add(
        'render',
        {
          artifactVersionId: version.id,
          projectId: seeded.project.id,
          workspaceId: seeded.workspace.id,
          artifactType: 'one_page_brief',
          packRevisionId: seeded.pack.id,
          correlationId: randomUUID(),
        },
        { jobId: `render-${version.id}` },
      );
      await expect
        .poll(async () => (await getArtifactVersionById(sql, version.id))?.status, {
          timeout: 15_000,
          interval: 100,
        })
        .toBe('current');
      const pdf = await objectStore.get(version.s3Key);
      expect(pdf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
    } finally {
      await worker.close();
      await queue.obliterate({ force: true });
      await queue.close();
    }
  });
});
