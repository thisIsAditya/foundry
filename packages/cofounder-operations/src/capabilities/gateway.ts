import { createHash } from 'node:crypto';

import { CreateProposalInputSchema } from '@foundry/api-contracts';
import {
  getCommandReceipt,
  getJourneyByProjectId,
  getRecordItemBySection,
  insertActivityEvent,
  insertCapabilityInvocation,
  insertCitation,
  insertCommandReceipt,
  insertEvidenceItem,
  insertProposalChangeV4,
  insertProposalV4,
  insertSource,
  insertSourceSnapshot,
  listEvidenceItemsByProjectId,
  listReadyContentBlocksByProjectId,
  listRecordItemsByProjectId,
  searchContentBlocks,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  RECORD_SECTION_DEFINITIONS,
  SourceIdSchema,
  type CofounderOperationId,
  type Project,
  type UserId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService, add, div, mul, sub } from '@foundry/policy';

import {
  CalculateInputSchema,
  CreateEvidenceDraftInputSchema,
  CAPABILITY_REGISTRY,
  PrepareMaterialInputSchema,
  SearchApprovedInputSchema,
  resolveCapabilityId,
  type CapabilityId,
} from './registry.js';

export type CapabilityInvokeResult = {
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
};

export class CapabilityGateway {
  constructor(
    private readonly sql: PoolSql,
    private readonly policyService: PolicyService,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async invoke(
    actor: {
      userId: UserId;
      membership: WorkspaceMembership;
      project: Project;
      operationId: CofounderOperationId;
    },
    name: string,
    input: unknown,
  ): Promise<CapabilityInvokeResult> {
    const started = Date.now();
    const capabilityId = resolveCapabilityId(name);
    if (capabilityId === null) {
      throw new AppError({
        code: 'capability_unsupported',
        explanation: 'That action is not available to the co-founder.',
        nextAction: 'Use a listed draft or read capability, or continue without it.',
      });
    }
    const capability = CAPABILITY_REGISTRY[capabilityId];
    if (!this.policyService.can(actor.membership, 'cofounder.respond')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot invoke co-founder capabilities.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    if (!this.policyService.can(actor.membership, capability.policyAction)) {
      await this.audit(actor, capabilityId, started, {
        summary: 'Policy denied this capability.',
        safeError: 'policy_forbidden',
      });
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot perform the matching manual action.',
        nextAction: 'Ask a workspace admin to change your role, or do this from the founder UI.',
      });
    }
    const result = await this.dispatch(actor, capabilityId, input);
    const idempotencyKey = idempotencyOf(input);
    await this.audit(actor, capabilityId, started, {
      summary: result.summary,
      ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
    });
    return result;
  }

  private async dispatch(
    actor: {
      userId: UserId;
      membership: WorkspaceMembership;
      project: Project;
      operationId: CofounderOperationId;
    },
    capabilityId: CapabilityId,
    input: unknown,
  ): Promise<CapabilityInvokeResult> {
    switch (capabilityId) {
      case 'venture.readCurrentState@1':
        return this.readCurrentState(actor);
      case 'evidence.searchApproved@1':
        return this.searchApproved(actor, input);
      case 'business.calculate@1':
        return this.calculate(input);
      case 'material.prepareDraft@1':
        return this.prepareMaterial(actor, input);
      case 'evidence.createDraft@1':
        return this.createEvidenceDraft(actor, input);
      case 'proposal.createDraft@1':
        return this.createProposalDraft(actor, input);
    }
  }

  private async readCurrentState(actor: { project: Project }): Promise<CapabilityInvokeResult> {
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const journey = await getJourneyByProjectId(tx, actor.project.id);
      const items = await listRecordItemsByProjectId(tx, actor.project.id);
      return {
        ok: true,
        summary:
          `Current stage is ${journey?.currentStage ?? 'idea'}. ${journey?.currentObjective ?? ''}`.trim(),
        data: {
          projectId: actor.project.id,
          currentStage: journey?.currentStage ?? 'idea',
          currentObjective: journey?.currentObjective ?? 'Capture the idea.',
          recordItemIds: items.map((item) => item.id),
        },
      };
    });
  }

  private async searchApproved(
    actor: { project: Project },
    input: unknown,
  ): Promise<CapabilityInvokeResult> {
    const parsed = SearchApprovedInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        summary: 'Search input was invalid. Accepted record state is unchanged.',
      };
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const [blocks, evidence] = await Promise.all([
        parsed.data.scope === 'intake'
          ? listReadyContentBlocksByProjectId(tx, actor.project.id, 12)
          : searchContentBlocks(tx, actor.project.id, parsed.data.query, 8),
        listEvidenceItemsByProjectId(tx, actor.project.id),
      ]);
      const needle = parsed.data.query.toLowerCase();
      const itemHits = evidence
        .filter(
          (item) => parsed.data.scope === 'intake' || item.summary.toLowerCase().includes(needle),
        )
        .slice(0, 8)
        .map((item) => ({
          id: item.id,
          kind: 'evidence',
          excerpt: item.summary.slice(0, 280),
          provenanceKind: item.provenance.kind,
        }));
      const blockHits = blocks.map((block) => ({
        id: block.id,
        kind: 'source',
        excerpt: (block.textContent ?? '').slice(0, 280),
        citationId: block.sourceSnapshotId,
      }));
      const hits = [...blockHits, ...itemHits].slice(0, 12);
      return {
        ok: true,
        summary:
          hits.length === 0
            ? 'No ready in-venture excerpts were available. No citations were invented.'
            : `Found ${String(hits.length)} source-backed excerpt(s) in this venture.`,
        data: { hits, ids: hits.map((hit) => hit.id) },
      };
    });
  }

  private calculate(input: unknown): CapabilityInvokeResult {
    const parsed = CalculateInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        summary: 'Calculation input was invalid. Accepted record state is unchanged.',
      };
    }
    try {
      const value =
        parsed.data.operation === 'add'
          ? add(parsed.data.left, parsed.data.right)
          : parsed.data.operation === 'sub'
            ? sub(parsed.data.left, parsed.data.right)
            : parsed.data.operation === 'mul'
              ? mul(parsed.data.left, parsed.data.right)
              : div(parsed.data.left, parsed.data.right);
      if (value === null) {
        return {
          ok: false,
          summary: 'Calculation could not divide by zero. Accepted record state is unchanged.',
        };
      }
      return {
        ok: true,
        summary: 'Deterministic calculation completed. Accepted record state is unchanged.',
        data: {
          value,
          ...(parsed.data.unit === undefined ? {} : { unit: parsed.data.unit }),
        },
      };
    } catch {
      return {
        ok: false,
        summary: 'Calculation could not be completed. Accepted record state is unchanged.',
      };
    }
  }

  private async prepareMaterial(
    actor: {
      userId: UserId;
      project: Project;
      operationId: CofounderOperationId;
    },
    input: unknown,
  ): Promise<CapabilityInvokeResult> {
    const parsed = PrepareMaterialInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        summary: 'Material draft input was invalid. Accepted record state is unchanged.',
      };
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const key = parsed.data.idempotencyKey ?? actor.operationId;
      const existing = await getCommandReceipt(tx, actor.userId, 'material.prepareDraft', key);
      if (existing !== null && typeof existing === 'object' && existing !== null) {
        return existing as CapabilityInvokeResult;
      }
      const item = await insertEvidenceItem(tx, {
        projectId: actor.project.id,
        summary: `${parsed.data.kind}: ${parsed.data.summary}`,
        provenance: {
          kind: 'unknown',
          sourceIds: [],
          sourceSnapshotIds: [],
          citationIds: [],
          verifiedAt: null,
        },
      });
      await insertActivityEvent(tx, {
        projectId: actor.project.id,
        workspaceId: actor.project.workspaceId,
        eventType: 'material_draft_prepared',
        actorType: 'agent',
        actorId: actor.userId,
        payload: { evidenceItemId: item.id, kind: parsed.data.kind },
      });
      const result: CapabilityInvokeResult = {
        ok: true,
        summary: 'Prepared a reviewable material draft. It is not accepted evidence.',
        data: { evidenceItemId: item.id, draftId: item.id, kind: parsed.data.kind },
      };
      await insertCommandReceipt(tx, {
        workspaceId: actor.project.workspaceId,
        projectId: actor.project.id,
        actorId: actor.userId,
        command: 'material.prepareDraft',
        idempotencyKey: key,
        result,
      });
      return result;
    });
  }

  private async createEvidenceDraft(
    actor: {
      userId: UserId;
      project: Project;
      operationId: CofounderOperationId;
    },
    input: unknown,
  ): Promise<CapabilityInvokeResult> {
    const parsed = CreateEvidenceDraftInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        summary: 'Evidence draft input was invalid. Accepted record state is unchanged.',
      };
    }
    if (parsed.data.url !== undefined) {
      return this.createCitedWebDraft(actor, {
        summary: parsed.data.summary,
        url: parsed.data.url,
        ...(parsed.data.excerpt === undefined ? {} : { excerpt: parsed.data.excerpt }),
        ...(parsed.data.idempotencyKey === undefined
          ? {}
          : { idempotencyKey: parsed.data.idempotencyKey }),
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const key = parsed.data.idempotencyKey ?? actor.operationId;
      const existing = await getCommandReceipt(tx, actor.userId, 'evidence.createDraft', key);
      if (existing !== null) {
        return existing as CapabilityInvokeResult;
      }
      const item = await insertEvidenceItem(tx, {
        projectId: actor.project.id,
        summary: parsed.data.summary,
        provenance: {
          kind: 'unknown',
          sourceIds:
            parsed.data.sourceId === undefined ? [] : [SourceIdSchema.parse(parsed.data.sourceId)],
          sourceSnapshotIds: [],
          citationIds: [],
          verifiedAt: null,
        },
      });
      const result: CapabilityInvokeResult = {
        ok: true,
        summary: 'Created an evidence draft for founder review. It is not accepted.',
        data: { evidenceItemId: item.id },
      };
      await insertCommandReceipt(tx, {
        workspaceId: actor.project.workspaceId,
        projectId: actor.project.id,
        actorId: actor.userId,
        command: 'evidence.createDraft',
        idempotencyKey: key,
        result,
      });
      return result;
    });
  }

  private async createCitedWebDraft(
    actor: {
      userId: UserId;
      project: Project;
      operationId: CofounderOperationId;
    },
    input: {
      summary: string;
      url?: string;
      excerpt?: string;
      idempotencyKey?: string;
    },
  ): Promise<CapabilityInvokeResult> {
    const url = input.url;
    if (url === undefined) {
      return { ok: false, summary: 'A source URL is required for web research drafts.' };
    }
    let response: Response;
    try {
      response = await this.fetchImpl(url, { signal: AbortSignal.timeout(5_000) });
    } catch {
      return {
        ok: false,
        summary: 'The source could not be retrieved. No citation was invented.',
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        summary: 'The source returned no usable page. No citation was invented.',
      };
    }
    const body = (await response.text()).slice(0, 8_000);
    const excerpt = (input.excerpt ?? body.replace(/\s+/g, ' ').trim()).slice(0, 500);
    if (excerpt.length === 0) {
      return {
        ok: false,
        summary: 'The source had no extractable excerpt. No citation was invented.',
      };
    }
    const hash = createHash('sha256').update(body).digest('hex');
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const key = input.idempotencyKey ?? actor.operationId;
      const existing = await getCommandReceipt(tx, actor.userId, 'evidence.createDraft', key);
      if (existing !== null) {
        return existing as CapabilityInvokeResult;
      }
      const source = await insertSource(tx, {
        projectId: actor.project.id,
        kind: 'url',
        status: 'ready',
        sourceUrl: url,
        sourceCategory: 'web',
        originalFilename: url,
        createdByUserId: actor.userId,
      });
      const snapshot = await insertSourceSnapshot(tx, {
        sourceId: source.id,
        contentHash: hash,
        parserMetadata: {
          canonicalUrl: url,
          publisher: hostnameOf(url),
          retrievedAt: new Date().toISOString(),
          excerpt,
        },
      });
      const citation = await insertCitation(tx, {
        sourceSnapshotId: snapshot.id,
        locator: { sourceSnapshotId: snapshot.id, charRange: [0, excerpt.length] },
      });
      const item = await insertEvidenceItem(tx, {
        projectId: actor.project.id,
        summary: input.summary,
        provenance: {
          kind: 'unknown',
          sourceIds: [source.id],
          sourceSnapshotIds: [snapshot.id],
          citationIds: [citation.id],
          verifiedAt: null,
        },
        citationIds: [citation.id],
      });
      const result: CapabilityInvokeResult = {
        ok: true,
        summary:
          'Created a citation-preserving evidence draft. Web research does not validate demand or outcomes.',
        data: {
          evidenceItemId: item.id,
          sourceId: source.id,
          citationId: citation.id,
        },
      };
      await insertCommandReceipt(tx, {
        workspaceId: actor.project.workspaceId,
        projectId: actor.project.id,
        actorId: actor.userId,
        command: 'evidence.createDraft',
        idempotencyKey: key,
        result,
      });
      return result;
    });
  }

  private async createProposalDraft(
    actor: {
      userId: UserId;
      membership: WorkspaceMembership;
      project: Project;
    },
    input: unknown,
  ): Promise<CapabilityInvokeResult> {
    const parsed = CreateProposalInputSchema.safeParse({
      ...(typeof input === 'object' && input !== null ? input : {}),
      projectId: actor.project.id,
    });
    if (!parsed.success) {
      return {
        ok: false,
        summary: 'Proposal draft input was invalid. Accepted record state is unchanged.',
      };
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const existing = await getCommandReceipt(
        tx,
        actor.userId,
        'proposal.create',
        parsed.data.idempotencyKey,
      );
      if (
        existing !== null &&
        typeof existing === 'object' &&
        existing !== null &&
        'proposal' in existing &&
        typeof existing.proposal === 'object' &&
        existing.proposal !== null &&
        'id' in existing.proposal &&
        typeof existing.proposal.id === 'string'
      ) {
        return {
          ok: true,
          summary: 'Created a reviewable proposal. It is not accepted.',
          data: { proposalId: existing.proposal.id },
        };
      }
      const proposal = await insertProposalV4(tx, {
        projectId: actor.project.id,
        workspaceId: actor.project.workspaceId,
        authorType: 'cofounder',
        authorId: actor.userId,
        rationale: parsed.data.rationale,
        uncertainty: parsed.data.uncertainty ?? null,
        interactionType: parsed.data.interactionType ?? 'change',
        correlationId: parsed.data.idempotencyKey,
      });
      const changes = [];
      for (const draft of parsed.data.changes) {
        const record = await getRecordItemBySection(
          tx,
          actor.project.id,
          draft.section,
          draft.itemKey ?? RECORD_SECTION_DEFINITIONS[draft.section].defaultItemKey,
        );
        changes.push(
          await insertProposalChangeV4(tx, {
            proposalId: proposal.id,
            projectId: actor.project.id,
            workspaceId: actor.project.workspaceId,
            recordItemId: record?.id ?? null,
            section: draft.section,
            itemKey: draft.itemKey ?? record?.itemKey ?? null,
            beforePayload: record?.content ?? null,
            afterPayload: draft.afterPayload,
            evidenceRefs: draft.evidenceRefs,
          }),
        );
      }
      await insertCommandReceipt(tx, {
        workspaceId: actor.project.workspaceId,
        projectId: actor.project.id,
        actorId: actor.userId,
        command: 'proposal.create',
        idempotencyKey: parsed.data.idempotencyKey,
        result: {
          proposal,
          changes,
          affectedSections: [...new Set(changes.map((change) => change.section))],
        },
      });
      return {
        ok: true,
        summary: 'Created a reviewable proposal. It is not accepted.',
        data: { proposalId: proposal.id },
      };
    });
  }

  private async audit(
    actor: {
      userId: UserId;
      project: Project;
      operationId: CofounderOperationId;
    },
    capabilityId: CapabilityId,
    started: number,
    result: { summary: string; safeError?: string; idempotencyKey?: string },
  ): Promise<void> {
    const capability = CAPABILITY_REGISTRY[capabilityId];
    await withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      await insertCapabilityInvocation(tx, {
        operationId: actor.operationId,
        projectId: actor.project.id,
        workspaceId: actor.project.workspaceId,
        capabilityName: capability.id,
        capabilityVersion: capability.version,
        riskClass: capability.riskClass,
        actorUserId: actor.userId,
        durationMs: Date.now() - started,
        safeResultSummary: result.summary,
        ...(result.safeError === undefined ? {} : { safeError: result.safeError }),
        ...(result.idempotencyKey === undefined ? {} : { idempotencyKey: result.idempotencyKey }),
      });
    });
  }
}

function idempotencyOf(input: unknown): string | undefined {
  if (typeof input === 'object' && input !== null && 'idempotencyKey' in input) {
    const value = (input as { idempotencyKey?: unknown }).idempotencyKey;
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}
