import {
  getDocumentBySourceId,
  getProjectById,
  getSourceById,
  insertContentBlock,
  insertDocument,
  insertDomainEvent,
  insertSourceSnapshot,
  searchContentBlocks,
  updateDocumentLatestSnapshot,
  updateSourceMimeType,
  updateSourceStatus,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  isIngestionRejectError,
  runIngestionPipeline,
  type MalwareScanOptions,
} from '@foundry/document-intelligence';
import {
  ProjectIdSchema,
  SourceIdSchema,
  WorkspaceIdSchema,
  type ProjectId,
  type WorkspaceId,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { z } from 'zod';

import type { ObjectStore } from '../storage/object-store.js';

export const IngestionJobDataSchema = z.object({
  sourceId: SourceIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  correlationId: z.string().min(1),
});
export type IngestionJobData = z.infer<typeof IngestionJobDataSchema>;

export type IngestionDeps = {
  sql: PoolSql;
  objectStore: ObjectStore;
  malware?: MalwareScanOptions;
};

export async function processIngestionJob(
  data: IngestionJobData,
  deps: IngestionDeps,
): Promise<void> {
  const parsed = IngestionJobDataSchema.parse(data);
  const loaded = await withWorkspaceScope(deps.sql, [parsed.workspaceId], async (tx) => {
    const source = await getSourceById(tx, parsed.sourceId);
    if (source === null) {
      return null;
    }
    const project = await getProjectById(tx, source.projectId);
    if (project === null || project.id !== parsed.projectId) {
      return null;
    }
    await updateSourceStatus(tx, source.id, 'processing');
    return { source, project };
  });

  if (loaded === null) {
    throw new AppError({
      code: 'not_found',
      explanation: 'Source not found for ingestion.',
      nextAction: 'Retry the upload.',
      correlationId: parsed.correlationId,
    });
  }
  if (loaded.source.s3Key === null) {
    await withWorkspaceScope(deps.sql, [parsed.workspaceId], async (tx) => {
      await updateSourceStatus(tx, parsed.sourceId, 'failed', 'parse_failed');
    });
    return;
  }

  try {
    const bytes = await deps.objectStore.get(loaded.source.s3Key);
    const result = await runIngestionPipeline({
      bytes,
      declaredMime: loaded.source.mimeType ?? 'application/octet-stream',
      filename: loaded.source.originalFilename,
      sourceId: loaded.source.id,
      ...(deps.malware === undefined ? {} : { malware: deps.malware }),
    });

    await withWorkspaceScope(deps.sql, [parsed.workspaceId], async (tx) => {
      await updateSourceMimeType(tx, loaded.source.id, result.sniffedMime);
      const snapshot = await insertSourceSnapshot(tx, {
        sourceId: loaded.source.id,
        contentHash: result.contentHash,
        parserMetadata: result.parserMetadata,
      });
      const existing = await getDocumentBySourceId(tx, loaded.source.id);
      const document =
        existing === null
          ? await insertDocument(tx, {
              sourceId: loaded.source.id,
              title: result.title,
              dataClassification: loaded.source.dataClassification,
            })
          : existing;
      await updateDocumentLatestSnapshot(tx, document.id, snapshot.id, result.title);

      for (const block of result.blocks) {
        await insertContentBlock(tx, {
          documentId: document.id,
          sourceSnapshotId: snapshot.id,
          blockType: block.blockType,
          sequenceNo: block.sequenceNo,
          textContent: block.textContent,
          locator: {
            sourceSnapshotId: snapshot.id,
            ...(block.page === undefined ? {} : { page: block.page }),
            ...(block.paragraph === undefined ? {} : { paragraph: block.paragraph }),
          },
        });
      }

      if (result.promptInjection.suspected) {
        await insertDomainEvent(tx, {
          eventType: 'prompt_injection_suspected',
          workspaceId: parsed.workspaceId,
          projectId: parsed.projectId,
          actorType: 'system',
          correlationId: parsed.correlationId,
          payload: {
            sourceId: loaded.source.id,
            matches: result.promptInjection.matches,
          },
        });
      }

      await updateSourceStatus(tx, loaded.source.id, 'ready');
    });
  } catch (error) {
    if (isIngestionRejectError(error)) {
      await withWorkspaceScope(deps.sql, [parsed.workspaceId], async (tx) => {
        await updateSourceStatus(tx, parsed.sourceId, 'failed', error.reason);
      });
      return;
    }
    throw error;
  }
}

export async function searchIngestedBlocks(
  sql: PoolSql,
  workspaceId: WorkspaceId,
  projectId: ProjectId,
  query: string,
) {
  return withWorkspaceScope(sql, [workspaceId], async (tx) =>
    searchContentBlocks(tx, projectId, query),
  );
}
