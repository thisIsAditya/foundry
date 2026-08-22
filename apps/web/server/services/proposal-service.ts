import type {
  CreateProposalInput,
  ProposalDetail,
  ReviewProposalInput,
} from '@foundry/api-contracts';
import {
  getCommandReceipt,
  getProposalV4ById,
  getRecordItemBySection,
  insertCommandReceipt,
  insertProposalChangeV4,
  insertProposalV4,
  listProposalChangesV4,
  listProposalsV4ByProjectId,
  updateProposalChangeOutcome,
  updateProposalV4Status,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  RECORD_SECTION_DEFINITIONS,
  canReviewProposal,
  proposalStatusFromOutcomes,
  type Project,
  type Proposal,
  type UserId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';

import type { BusinessRecordService } from './business-record-service';

export class ProposalService {
  constructor(
    private readonly sql: PoolSql,
    private readonly policyService: PolicyService,
    private readonly records: BusinessRecordService,
  ) {}

  async list(actor: { membership: WorkspaceMembership; project: Project }): Promise<Proposal[]> {
    if (!this.policyService.can(actor.membership, 'proposal.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read proposals.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      listProposalsV4ByProjectId(tx, actor.project.id),
    );
  }

  async get(
    actor: { membership: WorkspaceMembership; project: Project },
    proposalId: Proposal['id'],
  ): Promise<ProposalDetail> {
    if (!this.policyService.can(actor.membership, 'proposal.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read proposals.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const proposal = await getProposalV4ById(tx, proposalId);
      if (proposal === null || proposal.projectId !== actor.project.id) {
        throw new AppError({
          code: 'not_found',
          explanation: 'That proposal was not found.',
          nextAction: 'Open Decisions and pick a pending proposal.',
        });
      }
      const changes = await listProposalChangesV4(tx, proposal.id);
      return {
        proposal,
        changes,
        affectedSections: [...new Set(changes.map((change) => change.section))],
      };
    });
  }

  async create(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: CreateProposalInput,
    authorType: 'founder' | 'cofounder' = 'founder',
  ): Promise<ProposalDetail> {
    if (!this.policyService.can(actor.membership, 'proposal.review')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot create proposals.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const existing = await getCommandReceipt(
        tx,
        actor.userId,
        'proposal.create',
        input.idempotencyKey,
      );
      if (existing !== null) {
        return existing as ProposalDetail;
      }
      const proposal = await insertProposalV4(tx, {
        projectId: actor.project.id,
        workspaceId: actor.project.workspaceId,
        authorType,
        authorId: actor.userId,
        rationale: input.rationale,
        uncertainty: input.uncertainty ?? null,
        interactionType: input.interactionType ?? 'change',
        correlationId: input.idempotencyKey,
      });
      const changes = [];
      for (const draft of input.changes) {
        const item = await getRecordItemBySection(
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
            recordItemId: item?.id ?? null,
            section: draft.section,
            itemKey: draft.itemKey ?? item?.itemKey ?? null,
            beforePayload: item?.content ?? null,
            afterPayload: draft.afterPayload,
            evidenceRefs: draft.evidenceRefs,
          }),
        );
      }
      const detail = {
        proposal,
        changes,
        affectedSections: [...new Set(changes.map((change) => change.section))],
      };
      await insertCommandReceipt(tx, {
        workspaceId: actor.project.workspaceId,
        projectId: actor.project.id,
        actorId: actor.userId,
        command: 'proposal.create',
        idempotencyKey: input.idempotencyKey,
        result: detail,
      });
      return detail;
    });
  }

  async review(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: ReviewProposalInput,
  ): Promise<ProposalDetail> {
    if (!this.policyService.can(actor.membership, 'proposal.review')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot review proposals.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const existing = await getCommandReceipt(
        tx,
        actor.userId,
        'proposal.review',
        input.idempotencyKey,
      );
      if (existing !== null) {
        return existing as ProposalDetail;
      }
      const proposal = await getProposalV4ById(tx, input.proposalId);
      if (proposal === null || proposal.projectId !== actor.project.id) {
        throw new AppError({
          code: 'not_found',
          explanation: 'That proposal was not found.',
          nextAction: 'Open Decisions and pick a pending proposal.',
        });
      }
      const changes = await listProposalChangesV4(tx, proposal.id);
      const detail = {
        proposal,
        changes,
        affectedSections: [...new Set(changes.map((change) => change.section))],
      };
      if (!canReviewProposal(detail.proposal.status)) {
        throw new AppError({
          code: 'invalid_input',
          explanation: 'This proposal can no longer be reviewed.',
          nextAction: 'Keep the current record or create a new proposal.',
        });
      }
      if (detail.proposal.revision !== input.expectedRevision) {
        throw new AppError({
          code: 'stale_revision',
          explanation: 'This proposal changed since you loaded it.',
          nextAction: 'Reload the before/after values and review again.',
        });
      }
      for (const outcome of input.outcomes) {
        const change = detail.changes.find((item) => item.id === outcome.changeId);
        if (change === undefined) {
          throw new AppError({
            code: 'invalid_input',
            explanation: 'A selected change does not belong to this proposal.',
            nextAction: 'Review only the listed before/after rows.',
          });
        }
        await updateProposalChangeOutcome(tx, outcome.changeId, {
          outcome: outcome.outcome,
          afterPayload: outcome.modifiedAfter,
        });
      }
      const status = proposalStatusFromOutcomes(input.outcomes.map((item) => item.outcome));
      const updated = await updateProposalV4Status(tx, detail.proposal.id, {
        expectedRevision: input.expectedRevision,
        status,
      });
      if (updated === null) {
        throw new AppError({
          code: 'stale_revision',
          explanation: 'This proposal changed since you loaded it.',
          nextAction: 'Reload the before/after values and review again.',
        });
      }
      const accepted = input.outcomes.filter(
        (item) => item.outcome === 'accept' || item.outcome === 'modify',
      );
      if (accepted.length > 0) {
        const acceptedChanges = detail.changes.filter((change) =>
          accepted.some((item) => item.changeId === change.id),
        );
        await this.records.applyAcceptedChanges(
          tx,
          actor,
          {
            projectId: actor.project.id,
            proposalId: detail.proposal.id,
            changeIds: accepted.map((item) => item.changeId),
            expectedRevision: input.expectedRevision,
            idempotencyKey: input.idempotencyKey,
          },
          acceptedChanges.map((change) => {
            const outcome = accepted.find((item) => item.changeId === change.id);
            return {
              recordItemId: change.recordItemId,
              section: change.section,
              itemKey: change.itemKey,
              afterPayload: outcome?.modifiedAfter ?? change.afterPayload,
            };
          }),
        );
      }
      const refreshed = await getProposalV4ById(tx, detail.proposal.id);
      const refreshedChanges = await listProposalChangesV4(tx, detail.proposal.id);
      const result = {
        proposal: refreshed ?? updated,
        changes: refreshedChanges,
        affectedSections: [...new Set(refreshedChanges.map((change) => change.section))],
      };
      await insertCommandReceipt(tx, {
        workspaceId: actor.project.workspaceId,
        projectId: actor.project.id,
        actorId: actor.userId,
        command: 'proposal.review',
        idempotencyKey: input.idempotencyKey,
        result,
      });
      return result;
    });
  }
}
