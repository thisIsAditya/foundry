import { createHash } from 'node:crypto';

import type {
  DecideInterviewImportInput,
  ReviewInterviewImportCandidateInput,
  StartInterviewImportInput,
} from '@foundry/api-contracts';
import { classifyInterviewSource, extractInterviewCandidates } from '@foundry/domain';
import {
  getCommandReceipt,
  getInterviewImportBatchById,
  getInterviewImportCandidateById,
  getSourceById,
  insertActivityEvent,
  insertCommandReceipt,
  insertContentBlock,
  insertDocument,
  insertInterview,
  insertInterviewImportBatch,
  insertInterviewImportCandidate,
  insertQuote,
  insertSource,
  insertSourceSnapshot,
  listContentBlocksBySourceId,
  listInterviewImportBatchesByProjectId,
  listInterviewImportCandidatesByBatchId,
  listInterviewsByProjectId,
  listQuotesByInterviewIds,
  listSourceSnapshotsBySourceId,
  updateInterviewImportBatchStatus,
  updateInterviewImportCandidate,
  withWorkspaceScope,
  type PoolSql,
  type Sql,
} from '@foundry/db';
import {
  InterviewImportBatchIdSchema,
  InterviewImportCandidateIdSchema,
  SourceIdSchema,
  type InterviewImportBatch,
  type InterviewImportCandidate,
  type Project,
  type UserId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';

const EXTRACTOR_VERSION = 'v5.2-deterministic-1';

function asReceipt<T>(value: unknown): T | null {
  return value === null ? null : (value as T);
}

export class InterviewImportService {
  constructor(
    private readonly sql: PoolSql,
    private readonly policyService: PolicyService,
  ) {}

  async start(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: StartInterviewImportInput,
  ): Promise<{ batch: InterviewImportBatch; candidates: InterviewImportCandidate[] }> {
    this.assertWrite(actor.membership);
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const existing = asReceipt<{ batchId: string }>(
        await getCommandReceipt(
          tx,
          actor.userId,
          'evidence.startInterviewImport',
          input.idempotencyKey,
        ),
      );
      if (existing !== null) {
        return this.loadBatch(tx, actor.project.id, existing.batchId);
      }
      const prepared = await this.prepareSourceText(tx, actor, input);
      const extracted = extractInterviewCandidates(prepared.text);
      const { classification } = classifyInterviewSource(extracted);
      const batch = await insertInterviewImportBatch(tx, {
        projectId: actor.project.id,
        workspaceId: actor.project.workspaceId,
        sourceId: prepared.sourceId,
        ...(prepared.snapshotId === null ? {} : { sourceSnapshotId: prepared.snapshotId }),
        classification,
        status: extracted.length === 0 ? 'failed' : 'reviewing',
        extractorVersion: EXTRACTOR_VERSION,
        ...(extracted.length === 0
          ? { failureReason: 'No interview candidates could be extracted from this source.' }
          : {}),
      });
      const candidates: InterviewImportCandidate[] = [];
      for (const [index, item] of extracted.entries()) {
        candidates.push(
          await insertInterviewImportCandidate(tx, {
            batchId: batch.id,
            projectId: actor.project.id,
            workspaceId: actor.project.workspaceId,
            position: index,
            label: item.label,
            participantType: item.participantType,
            consentGiven: false,
            consentUnknown: true,
            notes: item.notes,
            quotes: item.quotes,
            excerpt: item.excerpt,
            warnings: item.warnings,
          }),
        );
      }
      await insertActivityEvent(tx, {
        projectId: actor.project.id,
        workspaceId: actor.project.workspaceId,
        eventType: 'interview_import_extracted',
        actorType: 'founder',
        actorId: actor.userId,
        payload: { batchId: batch.id, candidateCount: candidates.length },
      });
      await insertCommandReceipt(tx, {
        workspaceId: actor.project.workspaceId,
        projectId: actor.project.id,
        actorId: actor.userId,
        command: 'evidence.startInterviewImport',
        idempotencyKey: input.idempotencyKey,
        result: { batchId: batch.id },
      });
      return { batch, candidates };
    });
  }

  async list(actor: { membership: WorkspaceMembership; project: Project }) {
    this.assertRead(actor.membership);
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], (tx) =>
      listInterviewImportBatchesByProjectId(tx, actor.project.id),
    );
  }

  async get(
    actor: { membership: WorkspaceMembership; project: Project },
    batchId: string,
  ): Promise<{ batch: InterviewImportBatch; candidates: InterviewImportCandidate[] }> {
    this.assertRead(actor.membership);
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], (tx) =>
      this.loadBatch(tx, actor.project.id, batchId),
    );
  }

  async reviewCandidate(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: ReviewInterviewImportCandidateInput,
  ): Promise<InterviewImportCandidate> {
    this.assertWrite(actor.membership);
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const candidate = await getInterviewImportCandidateById(
        tx,
        InterviewImportCandidateIdSchema.parse(input.candidateId),
      );
      if (candidate === null || candidate.projectId !== actor.project.id) {
        throw new AppError({
          code: 'not_found',
          explanation: 'That import candidate was not found.',
          nextAction: 'Reload the import review.',
        });
      }
      const updated = await updateInterviewImportCandidate(tx, candidate.id, {
        ...(input.label === undefined ? {} : { label: input.label }),
        ...(input.participantType === undefined ? {} : { participantType: input.participantType }),
        ...(input.notes === undefined ? {} : { notes: input.notes }),
        ...(input.quotes === undefined ? {} : { quotes: input.quotes }),
        ...(input.consentGiven === undefined
          ? {}
          : { consentGiven: input.consentGiven, consentUnknown: false }),
        status: 'edited',
        founderEdits: {
          label: input.label ?? candidate.label,
          reviewedAt: new Date().toISOString(),
        },
      });
      if (updated === null) {
        throw new AppError({
          code: 'not_found',
          explanation: 'That import candidate could not be updated.',
          nextAction: 'Reload the import review.',
        });
      }
      return updated;
    });
  }

  async decide(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: DecideInterviewImportInput,
  ): Promise<{ created: number; rejected: number; duplicates: number }> {
    this.assertWrite(actor.membership);
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const existing = asReceipt<{ created: number; rejected: number; duplicates: number }>(
        await getCommandReceipt(
          tx,
          actor.userId,
          'evidence.decideInterviewImport',
          input.idempotencyKey,
        ),
      );
      if (existing !== null) {
        return existing;
      }
      const loaded = await this.loadBatch(tx, actor.project.id, input.batchId);
      const interviews = await listInterviewsByProjectId(tx, actor.project.id);
      const quotes = await listQuotesByInterviewIds(
        tx,
        interviews.map((item) => item.id),
      );
      const existingQuoteTexts = new Set(
        quotes.map((item) => item.textContent.trim().toLowerCase()),
      );
      const rejectIds = new Set(input.rejectIds);
      const acceptIds = new Set(input.acceptIds);
      let created = 0;
      let rejected = 0;
      let duplicates = 0;
      for (const candidate of loaded.candidates) {
        if (
          candidate.status === 'accepted' ||
          candidate.status === 'rejected' ||
          candidate.status === 'duplicate'
        ) {
          continue;
        }
        if (rejectIds.has(candidate.id)) {
          await updateInterviewImportCandidate(tx, candidate.id, { status: 'rejected' });
          rejected += 1;
          continue;
        }
        if (!acceptIds.has(candidate.id) || candidate.quotes.length === 0) {
          continue;
        }
        const duplicate = candidate.quotes.some((quote) =>
          existingQuoteTexts.has(quote.trim().toLowerCase()),
        );
        if (duplicate) {
          await updateInterviewImportCandidate(tx, candidate.id, { status: 'duplicate' });
          duplicates += 1;
          continue;
        }
        const interview = await insertInterview(tx, {
          projectId: actor.project.id,
          participantType: candidate.participantType,
          consent: {
            given: candidate.consentGiven === true,
            label: candidate.label,
            notes: candidate.notes,
            sourceId: loaded.batch.sourceId,
          },
        });
        for (const textContent of candidate.quotes) {
          await insertQuote(tx, {
            interviewId: interview.id,
            textContent,
            ...(loaded.batch.sourceSnapshotId === null
              ? {}
              : { sourceSnapshotId: loaded.batch.sourceSnapshotId }),
          });
          existingQuoteTexts.add(textContent.trim().toLowerCase());
        }
        await updateInterviewImportCandidate(tx, candidate.id, {
          status: 'accepted',
          acceptedInterviewId: interview.id,
        });
        created += 1;
      }
      const remaining = (await listInterviewImportCandidatesByBatchId(tx, loaded.batch.id)).filter(
        (item) => item.status === 'pending' || item.status === 'edited',
      );
      await updateInterviewImportBatchStatus(
        tx,
        loaded.batch.id,
        remaining.length > 0 ? 'reviewing' : created > 0 ? 'accepted' : 'rejected',
      );
      await insertActivityEvent(tx, {
        projectId: actor.project.id,
        workspaceId: actor.project.workspaceId,
        eventType: 'interview_import_decided',
        actorType: 'founder',
        actorId: actor.userId,
        payload: { batchId: loaded.batch.id, created, rejected, duplicates },
      });
      const result = { created, rejected, duplicates };
      await insertCommandReceipt(tx, {
        workspaceId: actor.project.workspaceId,
        projectId: actor.project.id,
        actorId: actor.userId,
        command: 'evidence.decideInterviewImport',
        idempotencyKey: input.idempotencyKey,
        result,
      });
      return result;
    });
  }

  private async loadBatch(
    tx: Sql,
    projectId: Project['id'],
    batchId: string,
  ): Promise<{ batch: InterviewImportBatch; candidates: InterviewImportCandidate[] }> {
    const batch = await getInterviewImportBatchById(
      tx,
      InterviewImportBatchIdSchema.parse(batchId),
    );
    if (batch === null || batch.projectId !== projectId) {
      throw new AppError({
        code: 'not_found',
        explanation: 'That interview import was not found.',
        nextAction: 'Open Evidence and start a new import.',
      });
    }
    const candidates = await listInterviewImportCandidatesByBatchId(tx, batch.id);
    return { batch, candidates };
  }

  private async prepareSourceText(
    tx: Sql,
    actor: { userId: UserId; project: Project },
    input: StartInterviewImportInput,
  ): Promise<{
    sourceId: ReturnType<typeof SourceIdSchema.parse>;
    snapshotId: InterviewImportBatch['sourceSnapshotId'];
    text: string;
  }> {
    if (input.sourceId !== undefined) {
      const source = await getSourceById(tx, SourceIdSchema.parse(input.sourceId));
      if (source === null || source.projectId !== actor.project.id) {
        throw new AppError({
          code: 'not_found',
          explanation: 'That source was not found in this venture.',
          nextAction: 'Upload the notes again or paste the interview text.',
        });
      }
      const blocks = await listContentBlocksBySourceId(tx, source.id);
      const text =
        blocks
          .map((block) => block.textContent ?? '')
          .join('\n\n')
          .trim() || (input.text ?? '').trim();
      if (text.length === 0) {
        throw new AppError({
          code: 'invalid_input',
          explanation: 'This source has no extracted text yet.',
          nextAction: 'Wait for ingestion to finish, or paste the interview notes.',
        });
      }
      const snapshots = await listSourceSnapshotsBySourceId(tx, source.id);
      return {
        sourceId: source.id,
        snapshotId: snapshots[0]?.id ?? null,
        text,
      };
    }
    const text = (input.text ?? '').trim();
    const source = await insertSource(tx, {
      projectId: actor.project.id,
      kind: 'interview_note',
      status: 'ready',
      originalFilename: input.filename ?? 'pasted-interview-notes.txt',
      mimeType: 'text/plain',
      createdByUserId: actor.userId,
    });
    const snapshot = await insertSourceSnapshot(tx, {
      sourceId: source.id,
      contentHash: createHash('sha256').update(text).digest('hex'),
      parserMetadata: { origin: 'founder_paste', extractorVersion: EXTRACTOR_VERSION },
    });
    const document = await insertDocument(tx, {
      sourceId: source.id,
      title: source.originalFilename,
    });
    await insertContentBlock(tx, {
      documentId: document.id,
      sourceSnapshotId: snapshot.id,
      blockType: 'text',
      sequenceNo: 1,
      textContent: text,
      locator: { sourceSnapshotId: snapshot.id, charRange: [0, text.length] },
    });
    return { sourceId: source.id, snapshotId: snapshot.id, text };
  }

  private assertRead(membership: WorkspaceMembership): void {
    if (!this.policyService.can(membership, 'evidence.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read interview imports.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
  }

  private assertWrite(membership: WorkspaceMembership): void {
    if (!this.policyService.can(membership, 'evidence.upload')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot import interviews.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
  }
}
