import type {
  AcceptAllSafeSectionsInput,
  AcceptRevisionInput,
  AcceptSectionInput,
  AddFounderAssertionInput,
  ExplainChangeInput,
  GetPackDiffInput,
  GetPackSectionInput,
  RejectRevisionInput,
  UpsertBeachheadInput,
  UpsertDmuInput,
  UpsertPackSectionInput,
} from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  emptyPackSectionBody,
  getPackRevisionById,
  getPackSection,
  insertBeachhead,
  insertDmu,
  listBeachheadsByPackRevisionId,
  listConversationMessagesByProjectId,
  listDmusByPackRevisionId,
  listPackRevisionsByProjectId,
  listPackSections,
  updateBeachheadDmuId,
  updateBeachheadSegmentDefinition,
  updateDmuRoles,
  updatePackRevisionAcceptedChanges,
  updatePackRevisionProposedChanges,
  updatePackRevisionStatus,
  updateProjectCurrentPackRevision,
  upsertPackSection,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  BusinessModelSectionKeys,
  GtmSectionBodySchema,
  LaunchSectionBodySchema,
  LegalSectionBodySchema,
  MvbpSectionBodySchema,
  OrgCostSectionBodySchema,
  PackSectionKeySchema,
  type Beachhead,
  type BusinessModelSectionKey,
  type Dmu,
  type PackRevision,
  type PackSection,
  type PackSectionBody,
  type PackSectionKey,
  type Project,
  type UserId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { evaluateMvbpScope, PolicyService } from '@foundry/policy';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';
import type { ScoringService } from './scoring-service';

const UNSAFE_BUSINESS_MODEL_SECTIONS = new Set<BusinessModelSectionKey>([
  'business_model_money_rules',
  'pricing_unit_economics',
  'willingness_to_pay',
]);

function parseBody(section: PackSectionKey, body: unknown): PackSectionBody {
  const empty = emptyPackSectionBody(section);
  const merged = { ...empty, ...(typeof body === 'object' && body !== null ? body : {}) };
  switch (section) {
    case 'mvbp':
      return MvbpSectionBodySchema.parse(merged);
    case 'gtm':
      return GtmSectionBodySchema.parse(merged);
    case 'org_cost':
      return OrgCostSectionBodySchema.parse(merged);
    case 'legal':
      return LegalSectionBodySchema.parse(merged);
    case 'launch':
      return LaunchSectionBodySchema.parse(merged);
  }
}

export class PackService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
    private readonly scoringService?: ScoringService,
  ) {}

  async getSection(
    actor: { membership: WorkspaceMembership; project: Project },
    input: GetPackSectionInput,
  ): Promise<{
    revision: PackRevision | null;
    section: PackSection | null;
    body: PackSectionBody;
  }> {
    if (!this.policyService.can(actor.membership, 'artifact.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read the pack.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const section = PackSectionKeySchema.parse(input.section);
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const revisionId = actor.project.currentPackRevisionId;
      if (revisionId === null) {
        return { revision: null, section: null, body: emptyPackSectionBody(section) };
      }
      const revision = await getPackRevisionById(tx, revisionId);
      const stored = await getPackSection(tx, revisionId, section);
      return {
        revision,
        section: stored,
        body: stored?.body ?? emptyPackSectionBody(section),
      };
    });
  }

  async getDiff(
    actor: { membership: WorkspaceMembership; project: Project },
    input: GetPackDiffInput,
  ): Promise<{ from: PackSection[]; to: PackSection[] }> {
    if (!this.policyService.can(actor.membership, 'artifact.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read pack diffs.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const fromRevision = await getPackRevisionById(tx, input.fromRevision);
      const toRevision = await getPackRevisionById(tx, input.toRevision);
      if (
        fromRevision === null ||
        toRevision === null ||
        fromRevision.projectId !== actor.project.id ||
        toRevision.projectId !== actor.project.id
      ) {
        throw new AppError({
          code: 'not_found',
          explanation: 'Pack revision not found.',
          nextAction: 'Pick revisions on this project.',
        });
      }
      return {
        from: await listPackSections(tx, fromRevision.id),
        to: await listPackSections(tx, toRevision.id),
      };
    });
  }

  async upsertSection(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: UpsertPackSectionInput,
  ): Promise<PackSection> {
    if (!this.policyService.can(actor.membership, 'artifact.generate')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot edit pack sections.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:pack.upsertSection:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as PackSection,
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          const revisionId = actor.project.currentPackRevisionId;
          if (revisionId === null) {
            throw new AppError({
              code: 'not_found',
              explanation: 'This project has no pack revision yet.',
              nextAction: 'Create the project again or continue the current sprint.',
            });
          }
          const body = parseBody(input.section, input.body);
          if (input.section === 'mvbp') {
            evaluateMvbpScope({
              hypothesis: (body as Extract<PackSectionBody, { featureCount: number }>).hypothesis,
              featureCount: (body as Extract<PackSectionBody, { featureCount: number }>)
                .featureCount,
              paymentPath: (body as Extract<PackSectionBody, { featureCount: number }>).paymentPath,
            });
          }
          return upsertPackSection(tx, {
            packRevisionId: revisionId,
            section: input.section,
            body,
          });
        }),
    );
  }

  async addFounderAssertion(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: AddFounderAssertionInput,
  ): Promise<PackSection> {
    if (!this.policyService.can(actor.membership, 'project.answer')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot add founder assertions.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:pack.addFounderAssertion:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as PackSection,
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          const revisionId = actor.project.currentPackRevisionId;
          if (revisionId === null) {
            throw new AppError({
              code: 'not_found',
              explanation: 'This project has no pack revision yet.',
              nextAction: 'Continue from the Founder Desk.',
            });
          }
          const existing =
            (await getPackSection(tx, revisionId, input.section))?.body ??
            emptyPackSectionBody(input.section);
          const founderAssertions = [
            ...('founderAssertions' in existing ? existing.founderAssertions : []),
            input.claim,
          ];
          return upsertPackSection(tx, {
            packRevisionId: revisionId,
            section: input.section,
            body: { ...existing, founderAssertions },
          });
        }),
    );
  }

  async acceptRevision(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: AcceptRevisionInput,
  ): Promise<PackRevision> {
    if (!this.policyService.can(actor.membership, 'artifact.generate')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot accept pack revisions.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    if (input.revisionId !== input.expectedRevision) {
      throw new AppError({
        code: 'stale_revision',
        explanation: 'The pack revision changed since you reviewed it.',
        nextAction: 'Reload the pack and accept again.',
      });
    }
    const key = `idem:${actor.userId}:pack.acceptRevision:${input.idempotencyKey}`;
    const accepted = await withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as PackRevision,
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          const revision = await getPackRevisionById(tx, input.revisionId);
          if (revision === null || revision.projectId !== actor.project.id) {
            throw new AppError({
              code: 'not_found',
              explanation: 'Pack revision not found.',
              nextAction: 'Pick a revision on this project.',
            });
          }
          const next = await updatePackRevisionStatus(tx, revision.id, 'accepted');
          await updateProjectCurrentPackRevision(tx, actor.project.id, next.id);
          return next;
        }),
    );
    await this.scoringService?.recalculate({
      ...actor.project,
      currentPackRevisionId: accepted.id,
    });
    return accepted;
  }

  async rejectRevision(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: RejectRevisionInput,
  ): Promise<PackRevision> {
    if (!this.policyService.can(actor.membership, 'artifact.generate')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot reject pack revisions.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:pack.rejectRevision:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as PackRevision,
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          const revision = await getPackRevisionById(tx, input.revisionId);
          if (revision === null || revision.projectId !== actor.project.id) {
            throw new AppError({
              code: 'not_found',
              explanation: 'Pack revision not found.',
              nextAction: 'Pick a revision on this project.',
            });
          }
          const proposedChanges =
            typeof revision.proposedChanges === 'object' && revision.proposedChanges !== null
              ? {
                  ...(revision.proposedChanges as Record<string, unknown>),
                  rejectionReason: input.reason,
                }
              : { rejectionReason: input.reason };
          await updatePackRevisionProposedChanges(tx, revision.id, proposedChanges);
          return updatePackRevisionStatus(tx, revision.id, 'rejected');
        }),
    );
  }

  async upsertBeachhead(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: UpsertBeachheadInput,
  ): Promise<Beachhead> {
    if (!this.policyService.can(actor.membership, 'artifact.generate')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot edit the beachhead.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:pack.upsertBeachhead:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as Beachhead,
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          const revisionId = actor.project.currentPackRevisionId;
          if (revisionId === null) {
            throw new AppError({
              code: 'not_found',
              explanation: 'This project has no pack revision yet.',
              nextAction: 'Create the project again or continue the current sprint.',
            });
          }
          const existing = await listBeachheadsByPackRevisionId(tx, revisionId);
          const current = existing[0];
          if (current !== undefined) {
            return updateBeachheadSegmentDefinition(tx, current.id, input.segmentDefinition);
          }
          return insertBeachhead(tx, {
            packRevisionId: revisionId,
            segmentDefinition: input.segmentDefinition,
            ...(input.personaId === undefined ? {} : { personaId: input.personaId }),
          });
        }),
    );
  }

  async upsertDmu(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: UpsertDmuInput,
  ): Promise<Dmu> {
    if (!this.policyService.can(actor.membership, 'artifact.generate')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot edit the decision-maker hypothesis.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:pack.upsertDmu:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as Dmu,
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          const revisionId = actor.project.currentPackRevisionId;
          if (revisionId === null) {
            throw new AppError({
              code: 'not_found',
              explanation: 'This project has no pack revision yet.',
              nextAction: 'Create the project again or continue the current sprint.',
            });
          }
          const beachheads = await listBeachheadsByPackRevisionId(tx, revisionId);
          const beachhead = beachheads.find((item) => item.id === input.beachheadId);
          if (beachhead === undefined) {
            throw new AppError({
              code: 'not_found',
              explanation: 'Set the beachhead segment before adding a decision-maker hypothesis.',
              nextAction: 'Save the beachhead first, then add the DMU.',
            });
          }
          const roles = {
            ...(input.user === undefined ? {} : { user: input.user }),
            ...(input.champion === undefined ? {} : { champion: input.champion }),
            ...(input.buyer === undefined ? {} : { buyer: input.buyer }),
            ...(input.approver === undefined ? {} : { approver: input.approver }),
            ...(input.veto === undefined ? {} : { veto: input.veto }),
            ...(input.procurement === undefined ? {} : { procurement: input.procurement }),
          };
          const existingDmus = await listDmusByPackRevisionId(tx, revisionId);
          const current = existingDmus.find((item) => item.beachheadId === beachhead.id);
          if (current !== undefined) {
            return updateDmuRoles(tx, current.id, roles);
          }
          const created = await insertDmu(tx, {
            packRevisionId: revisionId,
            beachheadId: beachhead.id,
            ...roles,
          });
          if (beachhead.dmuId === null) {
            await updateBeachheadDmuId(tx, beachhead.id, created.id);
          }
          return created;
        }),
    );
  }

  async listRevisions(actor: {
    membership: WorkspaceMembership;
    project: Project;
  }): Promise<PackRevision[]> {
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      listPackRevisionsByProjectId(tx, actor.project.id),
    );
  }

  async acceptSection(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: AcceptSectionInput,
  ): Promise<PackRevision> {
    if (input.revisionId !== input.expectedRevision) {
      throw new AppError({
        code: 'stale_revision',
        explanation: 'The pack revision changed since you reviewed it.',
        nextAction: 'Reload the pack and accept again.',
      });
    }
    const key = `idem:${actor.userId}:pack.acceptSection:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as PackRevision,
      (value) => superjson.stringify(value),
      async () => this.writeAcceptedKeys(actor, input.revisionId, [input.sectionKey]),
    );
  }

  async acceptAllSafeSections(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: AcceptAllSafeSectionsInput,
  ): Promise<{ revision: PackRevision; skippedUnsafeKeys: BusinessModelSectionKey[] }> {
    if (input.revisionId !== input.expectedRevision) {
      throw new AppError({
        code: 'stale_revision',
        explanation: 'The pack revision changed since you reviewed it.',
        nextAction: 'Reload the pack and accept again.',
      });
    }
    const key = `idem:${actor.userId}:pack.acceptAllSafeSections:${input.idempotencyKey}`;
    const safeKeys = BusinessModelSectionKeys.filter(
      (sectionKey) => !UNSAFE_BUSINESS_MODEL_SECTIONS.has(sectionKey),
    );
    const skippedUnsafeKeys = BusinessModelSectionKeys.filter((sectionKey) =>
      UNSAFE_BUSINESS_MODEL_SECTIONS.has(sectionKey),
    );
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) =>
        superjson.parse(raw) as {
          revision: PackRevision;
          skippedUnsafeKeys: BusinessModelSectionKey[];
        },
      (value) => superjson.stringify(value),
      async () => ({
        revision: await this.writeAcceptedKeys(actor, input.revisionId, safeKeys),
        skippedUnsafeKeys,
      }),
    );
  }

  async explainChange(
    actor: { membership: WorkspaceMembership; project: Project },
    input: ExplainChangeInput,
  ): Promise<{ explanation: string }> {
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const messages = await listConversationMessagesByProjectId(tx, actor.project.id);
      const match = messages.find((message) =>
        message.blocks.some(
          (block) =>
            block.kind === 'proposed_plan_change' &&
            block.revisionId === input.revisionId &&
            (block.sectionKey === undefined || block.sectionKey === input.sectionKey),
        ),
      );
      if (match !== undefined) {
        return { explanation: match.text };
      }
      return {
        explanation: `This revision updates ${input.sectionKey}. Review the diff before accepting money, pricing, or willingness-to-pay changes.`,
      };
    });
  }

  private async writeAcceptedKeys(
    actor: { project: Project },
    revisionId: PackRevision['id'],
    sectionKeys: readonly BusinessModelSectionKey[],
  ): Promise<PackRevision> {
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const revision = await getPackRevisionById(tx, revisionId);
      if (revision === null || revision.projectId !== actor.project.id) {
        throw new AppError({
          code: 'not_found',
          explanation: 'Pack revision not found.',
          nextAction: 'Pick a revision on this project.',
        });
      }
      const existing = parseAcceptedSectionKeys(revision.acceptedChanges);
      const next = [...new Set([...existing, ...sectionKeys])];
      return updatePackRevisionAcceptedChanges(tx, revision.id, { sectionKeys: next });
    });
  }
}

function parseAcceptedSectionKeys(acceptedChanges: unknown): string[] {
  if (
    typeof acceptedChanges !== 'object' ||
    acceptedChanges === null ||
    !('sectionKeys' in acceptedChanges)
  ) {
    return [];
  }
  const keys = (acceptedChanges as { sectionKeys?: unknown }).sectionKeys;
  return Array.isArray(keys) ? keys.filter((item): item is string => typeof item === 'string') : [];
}
