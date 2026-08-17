import {
  insertUser,
  updateArtifactCurrentVersion,
  updateArtifactVersionStatus,
  withWorkspaceScope,
} from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext, memoryJobQueue } from '../test/context';
import { sql } from '../test/harness';

const costStructure = {
  cogs: '20',
  variableCostPerUnit: '5',
  cac: '150',
  lifetimePeriods: 24,
};

describe('artifact generate, export, and pack export', () => {
  it('enqueues a render job and returns a signed download URL', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `art-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const ctx = await createTestContext(sql, user);
    const caller = appRouter.createCaller(ctx);
    const project = await caller.project.create({
      workspaceId: workspace.id,
      name: 'Cafe OS',
      idempotencyKey: randomUUID(),
    });

    const generated = await caller.artifact.generate({
      projectId: project.id,
      artifactType: 'company_pack',
      idempotencyKey: randomUUID(),
    });
    expect(generated.version.status).toBe('generating');
    expect(memoryJobQueue(ctx).renderJobs).toHaveLength(1);
    expect(memoryJobQueue(ctx).renderJobs[0]?.artifactType).toBe('company_pack');

    await ctx.objectStore.put(
      generated.version.s3Key,
      Buffer.from('# Cafe OS\n', 'utf8'),
      'text/markdown; charset=utf-8',
    );
    await withWorkspaceScope(sql, [workspace.id], async (tx) => {
      await updateArtifactVersionStatus(tx, generated.version.id, 'current');
      await updateArtifactCurrentVersion(tx, generated.artifact.id, generated.version.id);
    });

    const version = await caller.artifact.getVersion({
      projectId: project.id,
      artifactId: generated.artifact.id,
    });
    expect(version.status).toBe('current');

    const exported = await caller.artifact.export({
      projectId: project.id,
      artifactId: generated.artifact.id,
      version: generated.version.versionNumber,
      format: 'markdown',
    });
    expect(exported.url).toContain('memory://download/');
    expect(exported.format).toBe('markdown');

    await caller.moneyRules.setCurrent({
      projectId: project.id,
      currency: 'INR',
      unitOfSale: 'seat-month',
      price: '99',
      costStructure,
      idempotencyKey: randomUUID(),
    });
    const stale = await caller.artifact.getVersion({
      projectId: project.id,
      artifactId: generated.artifact.id,
      version: generated.version.versionNumber,
    });
    expect(stale.status).toBe('stale');

    const pack = await caller.pack.export({
      projectId: project.id,
      format: 'json',
      idempotencyKey: randomUUID(),
    });
    expect(pack.url).toContain('memory://download/');
    const json = JSON.parse(
      (
        await ctx.objectStore.get(decodeURIComponent(pack.url.replace('memory://download/', '')))
      ).toString('utf8'),
    ) as { format: string; manifest: { provenance: string } };
    expect(json.format).toBe('foundry-pack-export');
    expect(json.manifest.provenance).toContain('MoneyRules');
  });

  it('enqueues a workbook render after MoneyRules exist', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `wb-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const ctx = await createTestContext(sql, user);
    const caller = appRouter.createCaller(ctx);
    const project = await caller.project.create({
      workspaceId: workspace.id,
      name: 'Cafe OS',
      idempotencyKey: randomUUID(),
    });
    await caller.moneyRules.setCurrent({
      projectId: project.id,
      currency: 'INR',
      unitOfSale: 'seat-month',
      price: '99',
      billingFrequency: 'monthly',
      costStructure,
      idempotencyKey: randomUUID(),
    });
    await caller.moneyRules.upsertMarket({
      projectId: project.id,
      inputs: {
        totalAccounts: '1000',
        servedAccounts: '200',
        beachheadAccounts: '20',
        unitsPerAccountPerPeriod: '1',
        captureRate: '0.25',
        currency: 'INR',
      },
      idempotencyKey: randomUUID(),
    });
    const generated = await caller.artifact.generateWorkbook({
      projectId: project.id,
      idempotencyKey: randomUUID(),
    });
    expect(generated.version.status).toBe('generating');
    expect(generated.version.s3Key.endsWith('.xlsx')).toBe(true);
    expect(memoryJobQueue(ctx).renderJobs[0]?.artifactType).toBe('market_economics_workbook');
  });
});
