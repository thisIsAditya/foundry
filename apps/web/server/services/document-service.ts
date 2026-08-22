import type {
  ConfirmUploadInput,
  CreateUploadIntentInput,
  EvidenceLibraryFilter,
  RecordObservationInput,
  SearchEvidenceInput,
} from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  getProjectById,
  getSourceById,
  insertEvidenceItem,
  insertProject,
  insertSource,
  listAssumptionsByProjectId,
  listEvidenceItemsByProjectId,
  listInterviewsByProjectId,
  listProjectsByWorkspaceId,
  listQuotesByInterviewIds,
  listSourcesByProjectId,
  searchContentBlocks,
  updateSourceStatus,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  SourceIdSchema,
  type Project,
  type Source,
  type UserId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import { randomUUID } from 'node:crypto';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';
import type { JobQueue } from '../queue/job-queue';
import type { ObjectStore } from '../storage/object-store';
import { isUploadInboxProject, UPLOAD_INBOX_PROJECT_NAME } from './upload-inbox';

export class DocumentService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policy: PolicyService,
    private readonly objectStore: ObjectStore,
    private readonly jobs: JobQueue,
  ) {}

  async resolveUploadProject(
    actor: { userId: UserId; memberships: WorkspaceMembership[] },
    input: CreateUploadIntentInput,
    correlationId: string,
  ): Promise<{ membership: WorkspaceMembership; project: Project }> {
    const projectId = input.projectId;
    if (projectId !== undefined) {
      const project = await withWorkspaceScope(
        this.sql,
        actor.memberships.map((item) => item.workspaceId),
        (tx) => getProjectById(tx, projectId),
      );
      const membership =
        project === null
          ? undefined
          : actor.memberships.find((item) => item.workspaceId === project.workspaceId);
      if (project === null || membership === undefined) {
        throw this.notFound(correlationId);
      }
      return { membership, project };
    }
    const membership = actor.memberships.find((item) => item.workspaceId === input.workspaceId);
    if (membership === undefined) {
      throw this.notFound(correlationId);
    }
    const project = await withWorkspaceScope(this.sql, [membership.workspaceId], async (tx) => {
      const existing = (await listProjectsByWorkspaceId(tx, membership.workspaceId)).find(
        isUploadInboxProject,
      );
      return (
        existing ??
        insertProject(tx, { workspaceId: membership.workspaceId, name: UPLOAD_INBOX_PROJECT_NAME })
      );
    });
    return { membership, project };
  }

  async createUploadIntent(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: CreateUploadIntentInput,
    correlationId: string,
  ) {
    this.assertCan(actor.membership, 'evidence.upload');
    const audio = (limits.allowedAudioMimeTypes as readonly string[]).includes(input.mimeType);
    const allowed: readonly string[] = audio
      ? limits.allowedAudioMimeTypes
      : limits.allowedDocumentMimeTypes;
    const maxBytes = audio
      ? limits.maxUploadFileBytes.interviewRecording
      : limits.maxUploadFileBytes.document;
    if (!allowed.includes(input.mimeType) || input.sizeBytes > maxBytes) {
      throw new AppError({
        code: 'invalid_input',
        explanation: 'This evidence file is not allowed.',
        nextAction: 'Choose an allowed file within the size limit.',
        correlationId,
      });
    }
    const filename = input.filename.replaceAll('\\', '/').split('/').pop()?.slice(0, 255) ?? '';
    if (filename.length === 0) {
      throw new AppError({
        code: 'invalid_input',
        explanation: 'Filename is not valid.',
        nextAction: 'Choose a different file name.',
        correlationId,
      });
    }
    const created = await withIdempotency(
      this.coordination,
      `idem:${actor.userId}:evidence.createUploadIntent:${input.idempotencyKey}`,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse<{ sourceId: string; key: string; mimeType: string }>(raw),
      (value) => superjson.stringify(value),
      async () => {
        const sourceId = SourceIdSchema.parse(randomUUID());
        const key = `${actor.project.workspaceId}/${actor.project.id}/${sourceId}/${filename}`;
        await withWorkspaceScope(this.sql, [actor.project.workspaceId], (tx) =>
          insertSource(tx, {
            id: sourceId,
            projectId: actor.project.id,
            kind: audio ? 'voice_note' : (input.kind ?? 'upload'),
            status: 'pending',
            originalFilename: filename,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
            s3Key: key,
            createdByUserId: actor.userId,
          }),
        );
        return { sourceId, key, mimeType: input.mimeType };
      },
    );
    const upload = await this.objectStore.createUploadUrl(
      created.key,
      created.mimeType,
      limits.uploadUrlExpiresSeconds,
    );
    return {
      sourceId: SourceIdSchema.parse(created.sourceId),
      projectId: actor.project.id,
      uploadUrl: upload.url,
      uploadFields: upload.fields,
      expiresAt: upload.expiresAt,
    };
  }

  async confirmUpload(
    actor: { userId: UserId; memberships: WorkspaceMembership[] },
    input: ConfirmUploadInput,
    correlationId: string,
  ): Promise<{ sourceId: Source['id']; status: Source['status'] }> {
    const workspaceIds = actor.memberships.map((item) => item.workspaceId);
    const source = await withWorkspaceScope(this.sql, workspaceIds, (tx) =>
      getSourceById(tx, input.sourceId),
    );
    if (
      source === null ||
      source.s3Key === null ||
      !(await this.objectStore.exists(source.s3Key))
    ) {
      throw this.notFound(correlationId);
    }
    const project = await withWorkspaceScope(this.sql, workspaceIds, (tx) =>
      getProjectById(tx, source.projectId),
    );
    const membership =
      project === null
        ? undefined
        : actor.memberships.find((item) => item.workspaceId === project.workspaceId);
    if (project === null || membership === undefined) {
      throw this.notFound(correlationId);
    }
    this.assertCan(membership, 'evidence.upload');
    const updated = await withWorkspaceScope(this.sql, [project.workspaceId], (tx) =>
      updateSourceStatus(tx, source.id, 'uploaded'),
    );
    await this.jobs.enqueueIngestion({
      sourceId: updated.id,
      projectId: project.id,
      workspaceId: project.workspaceId,
      correlationId,
    });
    return { sourceId: updated.id, status: updated.status };
  }

  async list(membership: WorkspaceMembership, project: Project, correlationId: string) {
    void correlationId;
    this.assertCan(membership, 'evidence.read');
    return withWorkspaceScope(this.sql, [project.workspaceId], (tx) =>
      listSourcesByProjectId(tx, project.id),
    );
  }

  async search(
    membership: WorkspaceMembership,
    project: Project,
    input: SearchEvidenceInput,
    correlationId: string,
  ) {
    void correlationId;
    this.assertCan(membership, 'evidence.read');
    return withWorkspaceScope(this.sql, [project.workspaceId], (tx) =>
      searchContentBlocks(tx, project.id, input.query),
    );
  }

  async recordObservation(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: RecordObservationInput,
  ) {
    this.assertCan(actor.membership, 'evidence.upload');
    return withIdempotency(
      this.coordination,
      `idem:${actor.userId}:evidence.recordObservation:${input.idempotencyKey}`,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw),
      (value) => superjson.stringify(value),
      () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], (tx) =>
          insertEvidenceItem(tx, {
            projectId: actor.project.id,
            summary: input.summary,
            provenance: {
              kind: 'founder_asserted',
              sourceIds: [],
              sourceSnapshotIds: [],
              citationIds: [],
              verifiedAt: null,
            },
          }),
        ),
    );
  }

  async listLibrary(
    membership: WorkspaceMembership,
    project: Project,
    filter?: EvidenceLibraryFilter,
  ) {
    this.assertCan(membership, 'evidence.read');
    const items = await withWorkspaceScope(this.sql, [project.workspaceId], async (tx) => {
      const [sources, evidence, interviews, assumptions] = await Promise.all([
        listSourcesByProjectId(tx, project.id),
        listEvidenceItemsByProjectId(tx, project.id),
        listInterviewsByProjectId(tx, project.id),
        listAssumptionsByProjectId(tx, project.id),
      ]);
      const quotes = await listQuotesByInterviewIds(
        tx,
        interviews.map((item) => item.id),
      );
      return [
        ...sources.map((source) => ({
          id: source.id,
          kind: 'sources' as const,
          title: source.originalFilename ?? source.kind,
          detail: source.status,
          stale: false,
          conflicting: false,
          createdAt: source.createdAt,
        })),
        ...evidence.map((item) => ({
          id: item.id,
          kind: 'sources' as const,
          title: item.summary,
          detail: item.provenance.kind,
          stale: false,
          conflicting: false,
          createdAt: item.createdAt,
        })),
        ...interviews.map((interview) => ({
          id: interview.id,
          kind: 'interviews' as const,
          title:
            typeof interview.consent === 'object' &&
            interview.consent !== null &&
            'label' in interview.consent &&
            typeof interview.consent.label === 'string'
              ? interview.consent.label
              : interview.participantType.replaceAll('_', ' '),
          detail:
            interview.consent !== null &&
            typeof interview.consent === 'object' &&
            'given' in interview.consent &&
            interview.consent.given === true
              ? 'Consent recorded'
              : 'Consent unconfirmed',
          stale: false,
          conflicting: false,
          createdAt: interview.createdAt,
        })),
        ...quotes.map((quote) => ({
          id: quote.id,
          kind: 'quotes' as const,
          title: quote.textContent.slice(0, 140),
          detail:
            quote.sourceSnapshotId === null ? 'No source snapshot' : 'Linked to source snapshot',
          stale: false,
          conflicting: false,
          createdAt: quote.createdAt,
        })),
        ...assumptions.map((assumption) => ({
          id: assumption.id,
          kind: 'assumptions' as const,
          title: assumption.statement,
          detail: assumption.status,
          stale: false,
          conflicting: false,
          createdAt: assumption.createdAt,
        })),
      ];
    });
    return filter === undefined ? items : items.filter((item) => item.kind === filter);
  }

  private assertCan(
    membership: WorkspaceMembership,
    capability: 'evidence.read' | 'evidence.upload',
  ) {
    if (!this.policy.can(membership, capability)) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot access evidence in this workspace.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
  }

  private notFound(correlationId: string): AppError {
    return new AppError({
      code: 'not_found',
      explanation: 'Evidence location not found.',
      nextAction: 'Choose a workspace or venture you can access.',
      correlationId,
    });
  }
}
