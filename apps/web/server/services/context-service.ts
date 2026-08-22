import {
  getJourneyByProjectId,
  listConversationMessagesPage,
  listJourneySteps,
  listOpenStalenessByProjectId,
  listProposalsV4ByProjectId,
  listRecordItemsByProjectId,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import type { Project, UserId, WorkspaceMembership } from '@foundry/domain';
import type { CofounderContextPacket } from '@foundry/agent-runtime';
import { PolicyService } from '@foundry/policy';
import { AppError } from '@foundry/observability';

import { JourneyService } from './journey-service';

const INITIAL_CAPABILITIES = [
  'venture.readCurrentState',
  'evidence.createDraft',
  'business.calculate',
  'artifact.createDraft',
  'proposal.createDraft',
  'material.prepareDraft',
] as const;

export class ContextService {
  constructor(
    private readonly sql: PoolSql,
    private readonly policyService: PolicyService,
    private readonly journeys: JourneyService,
  ) {}

  async buildPacket(actor: {
    userId: UserId;
    membership: WorkspaceMembership;
    project: Project;
    correlationId: string;
  }): Promise<CofounderContextPacket> {
    if (!this.policyService.can(actor.membership, 'cofounder.respond')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot invoke the co-founder.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const overview = await this.journeys.getOverview(actor);
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const [items, messages, proposals, steps, staleness, journey] = await Promise.all([
        listRecordItemsByProjectId(tx, actor.project.id),
        listConversationMessagesPage(tx, actor.project.id, { limit: 8 }),
        listProposalsV4ByProjectId(tx, actor.project.id),
        listJourneySteps(tx, overview.journey.id),
        listOpenStalenessByProjectId(tx, actor.project.id),
        getJourneyByProjectId(tx, actor.project.id),
      ]);
      const omitted: string[] = ['full_transcript', 'raw_documents', 'hidden_reasoning'];
      if (staleness.length > 0) {
        omitted.push('unresolved_stale_detail');
      }
      return {
        actor: {
          workspaceId: actor.project.workspaceId,
          ventureId: actor.project.id,
          userId: actor.userId,
        },
        currentStage: journey?.currentStage ?? overview.journey.currentStage,
        currentObjective: journey?.currentObjective ?? overview.journey.currentObjective,
        acceptedRecord: items.map((item) => ({
          section: item.section,
          status: item.status,
          provenance: item.provenance,
          summary: item.content.summary,
        })),
        pendingProposals: proposals
          .filter((item) => item.status === 'awaiting_founder' || item.status === 'draft')
          .map((item) => ({ id: item.id, rationale: item.rationale })),
        activeSteps: steps
          .filter((item) => ['ready', 'in_progress', 'awaiting_founder'].includes(item.status))
          .map((item) => ({ id: item.id, objective: item.objective, status: item.status })),
        readiness: overview.readiness.map((item) => ({
          section: item.section,
          kind: item.kind,
          explanation: item.explanation,
        })),
        recentMessages: messages.map((item) => ({ actor: item.actor, text: item.text })),
        omitted,
        correlationId: actor.correlationId,
        allowedCapabilities: [...INITIAL_CAPABILITIES],
      };
    });
  }
}

export { INITIAL_CAPABILITIES };
