import type {
  ConfirmUploadInput,
  CreateUploadIntentInput,
  SearchEvidenceInput,
} from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  getProjectById,
  getSourceById,
  insertSource,
  listSourcesByProjectId,
  searchContentBlocks,
  updateSourceStatus,
  withWorkspaceScope,
  type ContentBlockSearchHit,
  type PoolSql,
} from '@foundry/db';
import {
  SourceIdSchema,
  type Project,
  type Source,
  type SourceId,
  type UserId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import { randomUUID } from 'node:crypto';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';
import type { IngestionJobData, JobQueue } from '../queue/job-queue';
import type { ObjectStore } from '../storage/object-store';

export type UploadIntentResult = {
  sourceId: SourceId;
  uploadUrl: string;
  uploadFields: Record<string, string>;
  expiresAt: Date;
};

export type ConfirmUploadResult = {
  sourceId: SourceId;
  status: Source['status'];
};

function safeFilename(filename: string): string {
  const base = filename.replaceAll('\\', '/').split('/').pop()?.trim() ?? '';
  if (base.length === 0 || base === '.' || base === '..') {
    throw new AppError({
      code: 'invalid_input',
      explanation: 'Filename is not valid.',
      nextAction: 'Choose a different file name.',
    });
  }
  return base.slice(0, 255);
}

export class DocumentService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
    private readonly objectStore: ObjectStore,
    private readonly jobQueue: JobQueue,
  ) {}

  async createUploadIntent(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: CreateUploadIntentInput,
    correlationId: string,
  ): Promise<UploadIntentResult> {
    if (!this.policyService.can(actor.membership, 'evidence.upload')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot upload evidence in this workspace.',
        nextAction: 'Ask a workspace admin to change your role.',
        correlationId,
      });
    }
    if (input.sizeBytes > limits.maxUploadFileBytes.document) {
      throw new AppError({
        code: 'invalid_input',
        explanation: 'File is larger than the 50 MB document limit.',
        nextAction: 'Upload a smaller file.',
        correlationId,
      });
    }
    const allowed: readonly string[] = limits.allowedDocumentMimeTypes;
    if (!allowed.includes(input.mimeType)) {
      throw new AppError({
        code: 'invalid_input',
        explanation: 'This file type is not allowed.',
        nextAction: 'Upload a PDF or plain-text document.',
        correlationId,
      });
    }

    const filename = safeFilename(input.filename);
    const cached = await withIdempotency(
      this.coordination,
      `idem:${actor.userId}:evidence.createUploadIntent:${input.idempotencyKey}`,
      limits.idempotencyKeyTtlSeconds,
      (raw) => {
        const parsed = superjson.parse<{ sourceId: string; s3Key: string; mimeType: string }>(raw);
        return {
          sourceId: SourceIdSchema.parse(parsed.sourceId),
          s3Key: parsed.s3Key,
          mimeType: parsed.mimeType,
        };
      },
      (value) => superjson.stringify(value),
      async () => {
        const sourceId = SourceIdSchema.parse(randomUUID());
        const s3Key = `${actor.project.workspaceId}/${actor.project.id}/${sourceId}/${filename}`;
        await withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          await insertSource(tx, {
            id: sourceId,
            projectId: actor.project.id,
            kind: 'upload',
            status: 'pending',
            originalFilename: filename,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
            s3Key,
            createdByUserId: actor.userId,
          });
        });
        await this.coordination.setNx(
          `upload-intent:${sourceId}`,
          '1',
          limits.uploadIntentTtlSeconds,
        );
        return { sourceId, s3Key, mimeType: input.mimeType };
      },
    );

    const upload = await this.objectStore.createUploadUrl(
      cached.s3Key,
      cached.mimeType,
      limits.uploadUrlExpiresSeconds,
    );
    return {
      sourceId: cached.sourceId,
      uploadUrl: upload.url,
      uploadFields: upload.fields,
      expiresAt: upload.expiresAt,
    };
  }

  async confirmUpload(
    actor: { userId: UserId; memberships: WorkspaceMembership[] },
    input: ConfirmUploadInput,
    correlationId: string,
  ): Promise<ConfirmUploadResult> {
    const workspaceIds = actor.memberships.map((membership) => membership.workspaceId);
    const loaded = await withWorkspaceScope(
      this.sql,
      workspaceIds,
      async (tx): Promise<{ source: Source; project: Project } | null> => {
        const source = await getSourceById(tx, input.sourceId);
        if (source === null) {
          return null;
        }
        const project = await getProjectById(tx, source.projectId);
        if (project === null) {
          return null;
        }
        return { source, project };
      },
    );
    if (loaded === null) {
      throw new AppError({
        code: 'not_found',
        explanation: 'Source not found.',
        nextAction: 'Upload the file again.',
        correlationId,
      });
    }

    const membership =
      actor.memberships.find((item) => item.workspaceId === loaded.project.workspaceId) ?? null;
    if (!this.policyService.can(membership, 'evidence.upload')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot confirm uploads in this workspace.',
        nextAction: 'Ask a workspace admin to change your role.',
        correlationId,
      });
    }

    return withIdempotency(
      this.coordination,
      `idem:${actor.userId}:evidence.confirmUpload:${input.idempotencyKey}`,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse<ConfirmUploadResult>(raw),
      (value) => superjson.stringify(value),
      async () => {
        if (
          loaded.source.status === 'uploaded' ||
          loaded.source.status === 'processing' ||
          loaded.source.status === 'ready'
        ) {
          return { sourceId: loaded.source.id, status: loaded.source.status };
        }
        const key = loaded.source.s3Key;
        if (key === null || !(await this.objectStore.exists(key))) {
          throw new AppError({
            code: 'invalid_input',
            explanation: 'The file has not been uploaded yet.',
            nextAction: 'Upload the file to the provided URL, then confirm.',
            correlationId,
          });
        }

        const updated = await withWorkspaceScope(
          this.sql,
          [loaded.project.workspaceId],
          async (tx) => updateSourceStatus(tx, loaded.source.id, 'uploaded'),
        );
        const job: IngestionJobData = {
          sourceId: updated.id,
          projectId: loaded.project.id,
          workspaceId: loaded.project.workspaceId,
          correlationId,
        };
        await this.jobQueue.enqueueIngestion(job);
        return { sourceId: updated.id, status: updated.status };
      },
    );
  }

  async list(
    membership: WorkspaceMembership,
    project: Project,
    correlationId: string,
  ): Promise<Source[]> {
    if (!this.policyService.can(membership, 'evidence.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot list evidence in this workspace.',
        nextAction: 'Ask a workspace admin to change your role.',
        correlationId,
      });
    }
    return withWorkspaceScope(this.sql, [project.workspaceId], async (tx) =>
      listSourcesByProjectId(tx, project.id),
    );
  }

  async search(
    membership: WorkspaceMembership,
    project: Project,
    input: SearchEvidenceInput,
    correlationId: string,
  ): Promise<ContentBlockSearchHit[]> {
    if (!this.policyService.can(membership, 'evidence.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot search evidence in this workspace.',
        nextAction: 'Ask a workspace admin to change your role.',
        correlationId,
      });
    }
    return withWorkspaceScope(this.sql, [project.workspaceId], async (tx) =>
      searchContentBlocks(tx, project.id, input.query),
    );
  }
}
