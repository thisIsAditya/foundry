import {
  artifactObjectKey,
  renderArtifact,
  RenderJobDataSchema,
  type ArtifactRenderContext,
  type RenderJobData,
} from '@foundry/artifacts';
import {
  getArtifactById,
  getArtifactVersionById,
  getLatestRenderJobByVersionId,
  getProjectById,
  updateArtifactCurrentVersion,
  updateArtifactVersionStatus,
  updateRenderJobStatus,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import { AppError } from '@foundry/observability';

import { loadPackSnapshot } from '../pack-snapshot.js';
import type { ObjectStore } from '../storage/object-store.js';

export type RenderProcessDeps = {
  sql: PoolSql;
  objectStore: ObjectStore;
};

export async function processRenderJob(
  data: RenderJobData,
  deps: RenderProcessDeps,
): Promise<void> {
  const job = RenderJobDataSchema.parse(data);
  await withWorkspaceScope(deps.sql, [job.workspaceId], async (tx) => {
    const version = await getArtifactVersionById(tx, job.artifactVersionId);
    if (version === null) {
      throw new AppError({
        code: 'not_found',
        explanation: 'Artifact version not found for this render job.',
        nextAction: 'Generate the artifact again.',
      });
    }
    if (version.status === 'current') {
      return;
    }
    const artifact = await getArtifactById(tx, version.artifactId);
    if (artifact === null || artifact.projectId !== job.projectId) {
      throw new AppError({
        code: 'not_found',
        explanation: 'Artifact not found for this render job.',
        nextAction: 'Generate the artifact again.',
      });
    }
    const renderJob = await getLatestRenderJobByVersionId(tx, version.id);
    if (renderJob !== null && renderJob.status !== 'succeeded') {
      await updateRenderJobStatus(tx, renderJob.id, 'running');
    }
    const project = await getProjectById(tx, job.projectId);
    if (project === null) {
      throw new AppError({
        code: 'not_found',
        explanation: 'Project not found for this render job.',
        nextAction: 'Generate the artifact again.',
      });
    }
    const snapshot = await loadPackSnapshot(tx, {
      ...project,
      currentPackRevisionId: job.packRevisionId,
    });
    const ctx: ArtifactRenderContext = {
      artifactType: job.artifactType,
      projectName: project.name,
      phase: snapshot.phase,
      packRevisionId: snapshot.pack.id,
      packRevisionNumber: snapshot.pack.revisionNumber,
      interviews: snapshot.interviews,
      quotes: snapshot.quotes,
      beachheads: snapshot.beachheads,
      dmus: snapshot.dmus,
      moneyRules: snapshot.moneyRules,
      marketModels: snapshot.marketModels,
      unitEconomics: snapshot.unitEconomics,
      wtpEvents: snapshot.wtpEvents,
      clarifications: snapshot.clarifications,
      generatedAt: new Date(),
    };
    const result = renderArtifact(ctx);
    for (const rendered of result.files) {
      await deps.objectStore.put(
        artifactObjectKey(job.projectId, artifact.id, version.versionNumber, rendered.extension),
        rendered.body,
        rendered.contentType,
      );
    }
    await updateArtifactVersionStatus(tx, version.id, 'current', result.citations);
    await updateArtifactCurrentVersion(tx, artifact.id, version.id);
    if (renderJob !== null) {
      await updateRenderJobStatus(tx, renderJob.id, 'succeeded');
    }
  });
}
