import type {
  AcceptRecordChangesInput,
  RecordExport,
  RecordSectionCard,
  RecordSectionDetail,
  SaveRecordSectionInput,
} from '@foundry/api-contracts';
import {
  getCommandReceipt,
  getEvidenceItemById,
  getLatestBusinessRecordVersion,
  getRecordItemById,
  getRecordItemBySection,
  insertActivityEvent,
  insertAssumption,
  insertBusinessRecordVersion,
  insertCommandReceipt,
  insertDecision,
  insertRecordItemStaleness,
  insertRecordSupportLink,
  listDecisionsByProjectId,
  listOpenStalenessByProjectId,
  listRecordItemsByProjectId,
  listRecordSupportLinksByItemId,
  markRecordItemStale,
  nextBusinessRecordVersionNumber,
  updateRecordItem,
  withWorkspaceScope,
  type PoolSql,
  type Sql,
} from '@foundry/db';
import {
  EvidenceItemIdSchema,
  RECORD_SECTION_DEFINITIONS,
  RecordItemContentSchema,
  RecordSectionKeys,
  canTransitionRecordItemStatus,
  dependentRecordSections,
  recordItemStatusAllowsProvenance,
  type Project,
  type RecordItem,
  type RecordItemContent,
  type RecordItemStatus,
  type RecordSectionKey,
  type UserId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';

function staleRevision(): AppError {
  return new AppError({
    code: 'stale_revision',
    explanation: 'This record changed since you loaded it.',
    nextAction: 'Reload the section and review the current versus proposed values.',
  });
}

export class BusinessRecordService {
  constructor(
    private readonly sql: PoolSql,
    private readonly policyService: PolicyService,
  ) {}

  async listSections(actor: {
    membership: WorkspaceMembership;
    project: Project;
  }): Promise<RecordSectionCard[]> {
    if (!this.policyService.can(actor.membership, 'record.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read this business record.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const [items, staleness] = await Promise.all([
        listRecordItemsByProjectId(tx, actor.project.id),
        listOpenStalenessByProjectId(tx, actor.project.id),
      ]);
      return RecordSectionKeys.map((section) => {
        const item = items.find((entry) => entry.section === section);
        if (item === undefined) {
          throw new AppError({
            code: 'not_found',
            explanation: 'The record skeleton is missing a section.',
            nextAction: 'Reload the venture. Empty sections should still exist.',
          });
        }
        return {
          section,
          label: RECORD_SECTION_DEFINITIONS[section].label,
          item,
          smallestAction: RECORD_SECTION_DEFINITIONS[section].smallestAction,
          staleReasons: staleness
            .filter((entry) => entry.affectedItemId === item.id)
            .map((entry) => entry.reason),
        };
      });
    });
  }

  async getSection(
    actor: { membership: WorkspaceMembership; project: Project },
    section: RecordSectionKey,
  ): Promise<RecordSectionDetail> {
    const cards = await this.listSections(actor);
    const card = cards.find((item) => item.section === section);
    if (card === undefined) {
      throw new AppError({
        code: 'not_found',
        explanation: 'That record section was not found.',
        nextAction: 'Open the business model and pick a listed section.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const version = await getLatestBusinessRecordVersion(tx, actor.project.id);
      const links = await listRecordSupportLinksByItemId(tx, card.item.id);
      const evidence = await Promise.all(
        links
          .filter((link) => link.targetKind === 'evidence')
          .map(async (link) => {
            const item = await getEvidenceItemById(tx, EvidenceItemIdSchema.parse(link.targetId));
            return item === null ? null : { id: item.id, summary: item.summary };
          }),
      );
      const decisions = await listDecisionsByProjectId(tx, actor.project.id);
      const linkedDecisions = links
        .filter((link) => link.targetKind === 'decision')
        .map((link) => {
          const decision = decisions.find((item) => item.id === link.targetId);
          return {
            id: link.targetId,
            statement:
              decision === undefined
                ? 'Linked decision'
                : typeof decision.chosen === 'string'
                  ? decision.chosen
                  : JSON.stringify(decision.chosen),
          };
        });
      return {
        section: card.section,
        label: card.label,
        item: card.item,
        provenance: card.item.provenance,
        versionNumber: version?.versionNumber ?? null,
        linkedEvidence: evidence.filter((item) => item !== null),
        linkedDecisions,
        staleReasons: card.staleReasons,
        smallestAction: card.smallestAction,
        pendingProposal: null,
      };
    });
  }

  async exportRecord(actor: {
    membership: WorkspaceMembership;
    project: Project;
    currentStage: RecordExport['currentStage'];
  }): Promise<RecordExport> {
    const sections = await this.listSections(actor);
    const version = await withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      getLatestBusinessRecordVersion(tx, actor.project.id),
    );
    return {
      projectId: actor.project.id,
      versionNumber: version?.versionNumber ?? null,
      exportedAt: new Date(),
      currentStage: actor.currentStage,
      sections,
      uncertainty: sections
        .filter((item) => item.item.status !== 'accepted')
        .map((item) => `${item.label} is ${item.item.status} (${item.item.provenance}).`),
    };
  }

  async acceptChanges(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: AcceptRecordChangesInput,
    changes: readonly {
      recordItemId: RecordItem['id'] | null;
      section: RecordSectionKey;
      itemKey: string | null;
      afterPayload: unknown;
    }[],
  ): Promise<{ versionNumber: number }> {
    if (!this.policyService.can(actor.membership, 'record.accept')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot accept record changes.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      this.applyAcceptedChanges(tx, actor, input, changes),
    );
  }

  async applyAcceptedChanges(
    tx: Sql,
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: AcceptRecordChangesInput,
    changes: readonly {
      recordItemId: RecordItem['id'] | null;
      section: RecordSectionKey;
      itemKey: string | null;
      afterPayload: unknown;
    }[],
  ): Promise<{ versionNumber: number }> {
    const existing = await getCommandReceipt(
      tx,
      actor.userId,
      'record.acceptChanges',
      input.idempotencyKey,
    );
    if (existing !== null) {
      return existing as { versionNumber: number };
    }
    const versionNumber = await nextBusinessRecordVersionNumber(tx, actor.project.id);
    const version = await insertBusinessRecordVersion(tx, {
      projectId: actor.project.id,
      workspaceId: actor.project.workspaceId,
      versionNumber,
      acceptedBy: actor.userId,
      sourceProposalIds: [input.proposalId],
    });
    for (const change of changes) {
      const item = await this.resolveItem(tx, actor.project.id, change);
      if (item === null) {
        continue;
      }
      const content = parseContent(change.afterPayload, item.content);
      const updated = await moveItemToAccepted(tx, item, content, version.id);
      await this.propagateStaleness(tx, actor.project, updated);
    }
    await insertActivityEvent(tx, {
      projectId: actor.project.id,
      workspaceId: actor.project.workspaceId,
      eventType: 'record_version_accepted',
      actorType: 'founder',
      actorId: actor.userId,
      proposalId: input.proposalId,
      versionId: version.id,
      payload: { versionNumber },
    });
    const result = { versionNumber };
    await insertCommandReceipt(tx, {
      workspaceId: actor.project.workspaceId,
      projectId: actor.project.id,
      actorId: actor.userId,
      command: 'record.acceptChanges',
      idempotencyKey: input.idempotencyKey,
      result,
    });
    return result;
  }

  async saveSection(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: SaveRecordSectionInput,
  ): Promise<{ versionNumber: number }> {
    if (!this.policyService.can(actor.membership, 'record.accept')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot accept record changes.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const existing = await getCommandReceipt(
        tx,
        actor.userId,
        'record.saveSection',
        input.idempotencyKey,
      );
      if (existing !== null) {
        return existing as { versionNumber: number };
      }
      const item = await getRecordItemBySection(
        tx,
        actor.project.id,
        input.section,
        RECORD_SECTION_DEFINITIONS[input.section].defaultItemKey,
      );
      if (item === null) {
        throw new AppError({
          code: 'not_found',
          explanation: 'That record section was not found.',
          nextAction: 'Reload the business model.',
        });
      }
      if (item.revision !== input.expectedRevision) {
        throw staleRevision();
      }
      const result = await this.acceptFounderWrite(tx, actor, {
        item,
        summary: input.summary,
        command: 'record.saveSection',
        idempotencyKey: input.idempotencyKey,
      });
      for (const evidenceId of input.evidenceIds ?? []) {
        await insertRecordSupportLink(tx, {
          projectId: actor.project.id,
          workspaceId: actor.project.workspaceId,
          recordItemId: item.id,
          targetKind: 'evidence',
          targetId: evidenceId,
          relationType: 'supports',
        });
      }
      return result;
    });
  }

  async appendFounderNote(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: { summary: string; section?: RecordSectionKey; kind: string; idempotencyKey: string },
  ): Promise<{ versionNumber: number } | null> {
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const section = input.section ?? 'evidence_and_learning';
      const item = await getRecordItemBySection(
        tx,
        actor.project.id,
        section,
        RECORD_SECTION_DEFINITIONS[section].defaultItemKey,
      );
      if (item === null) {
        return null;
      }
      return this.acceptFounderWrite(tx, actor, {
        item,
        summary: input.summary,
        command: 'record.appendFounderNote',
        idempotencyKey: input.idempotencyKey,
        fields: { lastNote: input.summary, kind: input.kind },
      });
    });
  }

  async recordAssumption(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    statement: string,
    idempotencyKey: string,
  ): Promise<void> {
    await withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      await insertAssumption(tx, { projectId: actor.project.id, statement });
      const item = await getRecordItemBySection(
        tx,
        actor.project.id,
        'assumptions_and_questions',
        RECORD_SECTION_DEFINITIONS.assumptions_and_questions.defaultItemKey,
      );
      if (item !== null) {
        await this.acceptFounderWrite(tx, actor, {
          item,
          summary: statement,
          command: 'record.recordAssumption',
          idempotencyKey,
        });
      }
    });
  }

  async recordDecision(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: { statement: string; rationale: string; idempotencyKey: string },
  ): Promise<void> {
    await withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const decision = await insertDecision(tx, {
        projectId: actor.project.id,
        options: [input.statement],
        chosen: input.statement,
        rationale: input.rationale,
        decidedByUserId: actor.userId,
      });
      const item = await getRecordItemBySection(
        tx,
        actor.project.id,
        'decisions_and_changes',
        RECORD_SECTION_DEFINITIONS.decisions_and_changes.defaultItemKey,
      );
      if (item !== null) {
        await this.acceptFounderWrite(tx, actor, {
          item,
          summary: input.statement,
          command: 'record.recordDecision',
          idempotencyKey: input.idempotencyKey,
          fields: { rationale: input.rationale },
        });
        await insertRecordSupportLink(tx, {
          projectId: actor.project.id,
          workspaceId: actor.project.workspaceId,
          recordItemId: item.id,
          targetKind: 'decision',
          targetId: decision.id,
          relationType: 'supports',
        });
      }
    });
  }

  private async acceptFounderWrite(
    tx: Sql,
    actor: { userId: UserId; project: Project },
    input: {
      item: RecordItem;
      summary: string;
      command: string;
      idempotencyKey: string;
      fields?: Record<string, unknown>;
    },
  ): Promise<{ versionNumber: number }> {
    const existing = await getCommandReceipt(tx, actor.userId, input.command, input.idempotencyKey);
    if (existing !== null) {
      return existing as { versionNumber: number };
    }
    const versionNumber = await nextBusinessRecordVersionNumber(tx, actor.project.id);
    const version = await insertBusinessRecordVersion(tx, {
      projectId: actor.project.id,
      workspaceId: actor.project.workspaceId,
      versionNumber,
      acceptedBy: actor.userId,
      sourceProposalIds: [],
    });
    const content = {
      summary: input.summary,
      fields: { ...input.item.content.fields, ...(input.fields ?? {}) },
    };
    await moveItemToAccepted(tx, input.item, content, version.id);
    await insertActivityEvent(tx, {
      projectId: actor.project.id,
      workspaceId: actor.project.workspaceId,
      eventType: 'record_version_accepted',
      actorType: 'founder',
      actorId: actor.userId,
      versionId: version.id,
      payload: { versionNumber, command: input.command, section: input.item.section },
    });
    const result = { versionNumber };
    await insertCommandReceipt(tx, {
      workspaceId: actor.project.workspaceId,
      projectId: actor.project.id,
      actorId: actor.userId,
      command: input.command,
      idempotencyKey: input.idempotencyKey,
      result,
    });
    return result;
  }

  private async resolveItem(
    tx: Sql,
    projectId: Project['id'],
    change: {
      recordItemId: RecordItem['id'] | null;
      section: RecordSectionKey;
      itemKey: string | null;
    },
  ): Promise<RecordItem | null> {
    if (change.recordItemId !== null) {
      return getRecordItemById(tx, change.recordItemId);
    }
    return getRecordItemBySection(
      tx,
      projectId,
      change.section,
      change.itemKey ?? RECORD_SECTION_DEFINITIONS[change.section].defaultItemKey,
    );
  }

  private async propagateStaleness(tx: Sql, project: Project, source: RecordItem): Promise<void> {
    const dependents = dependentRecordSections(source.section);
    const items = await listRecordItemsByProjectId(tx, project.id);
    for (const section of dependents) {
      const affected = items.find((item) => item.section === section);
      if (affected === undefined || affected.status !== 'accepted') {
        continue;
      }
      await markRecordItemStale(tx, affected.id);
      await insertRecordItemStaleness(tx, {
        projectId: project.id,
        workspaceId: project.workspaceId,
        sourceItemId: source.id,
        affectedItemId: affected.id,
        reason: `${source.title} changed. ${affected.title} may no longer follow from the accepted record.`,
      });
    }
  }
}

async function moveItemToAccepted(
  tx: Sql,
  item: RecordItem,
  content: RecordItemContent,
  versionId: NonNullable<RecordItem['currentVersionId']>,
): Promise<RecordItem> {
  let current = item;
  const bridge: Partial<Record<RecordItemStatus, RecordItemStatus>> = {
    empty: 'draft',
    needs_evidence: 'review',
    accepted: 'review',
    blocked: 'draft',
    deferred: 'draft',
  };
  const next = bridge[current.status];
  if (next !== undefined) {
    if (!canTransitionRecordItemStatus(current.status, next)) {
      throw new AppError({
        code: 'invalid_input',
        explanation: `${item.title} cannot move to accepted from ${item.status}.`,
        nextAction: 'Keep the current value or modify the proposal.',
      });
    }
    const bridged = await updateRecordItem(tx, current.id, {
      expectedRevision: current.revision,
      content,
      status: next,
      provenance: 'founder_input',
    });
    if (bridged === null) {
      throw staleRevision();
    }
    current = bridged;
  }
  if (!canTransitionRecordItemStatus(current.status, 'accepted')) {
    throw new AppError({
      code: 'invalid_input',
      explanation: `${item.title} cannot move to accepted from ${current.status}.`,
      nextAction: 'Keep the current value or modify the proposal.',
    });
  }
  if (!recordItemStatusAllowsProvenance('accepted', 'founder_approved')) {
    throw new AppError({
      code: 'invalid_input',
      explanation: 'Accepted items cannot keep AI-proposal provenance.',
      nextAction: 'Accept as founder-approved content after review.',
    });
  }
  const updated = await updateRecordItem(tx, current.id, {
    expectedRevision: current.revision,
    content,
    status: 'accepted',
    provenance: 'founder_approved',
    currentVersionId: versionId,
  });
  if (updated === null) {
    throw staleRevision();
  }
  return updated;
}

function parseContent(payload: unknown, fallback: RecordItemContent): RecordItemContent {
  if (typeof payload === 'string') {
    return { summary: payload, fields: fallback.fields };
  }
  const parsed = RecordItemContentSchema.safeParse(payload);
  if (parsed.success) {
    return parsed.data;
  }
  if (payload !== null && typeof payload === 'object' && 'summary' in payload) {
    const summary = (payload as { summary?: unknown }).summary;
    return {
      summary: typeof summary === 'string' ? summary : fallback.summary,
      fields: fallback.fields,
    };
  }
  return fallback;
}
