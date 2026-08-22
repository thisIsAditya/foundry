import {
  CofounderContextEnvelopeSchema,
  type CofounderContextEnvelope,
} from '@foundry/agent-runtime';
import {
  getJourneyByProjectId,
  listActiveProjectMemoryByProjectId,
  listAssumptionsByProjectId,
  listConversationMessagesPage,
  listDecisionsByProjectId,
  listEvidenceItemsByProjectId,
  listInterviewsByProjectId,
  listJourneySteps,
  listOpenStalenessByProjectId,
  listProposalsV4ByProjectId,
  listQuotesByInterviewIds,
  listRecordItemsByProjectId,
  listRecordSupportLinksByProjectId,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  RECORD_SECTION_DEFINITIONS,
  readinessSignal,
  type Project,
  type UserId,
  type WorkspaceMembership,
} from '@foundry/domain';

import { CAPABILITY_IDS } from './capabilities/registry.js';

const RECENT_MESSAGE_LIMIT = 8;
const EVIDENCE_LIMIT = 12;
const QUOTE_LIMIT = 16;

function consentGiven(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'given' in value &&
    (value as { given?: unknown }).given === true
  );
}

export async function buildCofounderContextEnvelope(
  sql: PoolSql,
  actor: {
    userId: UserId;
    membership: WorkspaceMembership;
    project: Project;
    correlationId: string;
  },
): Promise<CofounderContextEnvelope> {
  return withWorkspaceScope(sql, [actor.project.workspaceId], async (tx) => {
    const journey = await getJourneyByProjectId(tx, actor.project.id);
    const [
      items,
      messages,
      proposals,
      steps,
      staleness,
      evidence,
      interviews,
      decisions,
      assumptions,
      memory,
      supportLinks,
    ] = await Promise.all([
      listRecordItemsByProjectId(tx, actor.project.id),
      listConversationMessagesPage(tx, actor.project.id, { limit: RECENT_MESSAGE_LIMIT }),
      listProposalsV4ByProjectId(tx, actor.project.id),
      journey === null ? Promise.resolve([]) : listJourneySteps(tx, journey.id),
      listOpenStalenessByProjectId(tx, actor.project.id),
      listEvidenceItemsByProjectId(tx, actor.project.id),
      listInterviewsByProjectId(tx, actor.project.id),
      listDecisionsByProjectId(tx, actor.project.id),
      listAssumptionsByProjectId(tx, actor.project.id),
      listActiveProjectMemoryByProjectId(tx, actor.project.id),
      listRecordSupportLinksByProjectId(tx, actor.project.id),
    ]);
    const quotes = await listQuotesByInterviewIds(
      tx,
      interviews.map((item) => item.id),
    );
    const staleIds = new Set(staleness.map((item) => item.affectedItemId));
    const omitted = ['full_transcript', 'raw_documents', 'hidden_reasoning'];
    if (staleness.length > 0) {
      omitted.push('unresolved_stale_detail');
    }
    if (evidence.length > EVIDENCE_LIMIT) {
      omitted.push('older_evidence_items');
    }
    if (quotes.length > QUOTE_LIMIT) {
      omitted.push('older_quotes');
    }
    const latestMemory = memory[0];
    const envelope = {
      actor: {
        workspaceId: actor.project.workspaceId,
        ventureId: actor.project.id,
        userId: actor.userId,
      },
      currentStage: journey?.currentStage ?? 'idea',
      currentObjective: journey?.currentObjective ?? 'Capture the idea.',
      acceptedRecord: items.map((item) => ({
        id: item.id,
        section: item.section,
        status: item.status,
        provenance: item.provenance,
        summary: item.content.summary,
        versionId: item.currentVersionId,
        stale: staleIds.has(item.id),
      })),
      pendingProposals: proposals
        .filter((item) => item.status === 'awaiting_founder' || item.status === 'draft')
        .map((item) => ({ id: item.id, rationale: item.rationale })),
      activeSteps: steps
        .filter((item) =>
          ['ready', 'in_progress', 'awaiting_founder', 'submitted'].includes(item.status),
        )
        .map((item) => ({ id: item.id, objective: item.objective, status: item.status })),
      deferredSteps: steps
        .filter((item) => item.status === 'deferred')
        .map((item) => ({ id: item.id, objective: item.objective, status: item.status })),
      blockedSteps: steps
        .filter((item) => item.status === 'blocked')
        .map((item) => ({ id: item.id, objective: item.objective, status: item.status })),
      readiness: items.map((item) => {
        const signal = readinessSignal({
          section: item.section,
          label: item.title,
          status: item.status,
          provenance: item.provenance,
          smallestAction: RECORD_SECTION_DEFINITIONS[item.section].smallestAction,
        });
        return {
          section: signal.section,
          kind: signal.kind,
          explanation: signal.explanation,
        };
      }),
      evidence: evidence.slice(0, EVIDENCE_LIMIT).map((item) => ({
        id: item.id,
        summary: item.summary,
        provenanceKind: item.provenance.kind,
      })),
      interviews: interviews.map((item) => ({
        id: item.id,
        participantType: item.participantType,
        consentGiven: consentGiven(item.consent),
      })),
      quotes: quotes.slice(0, QUOTE_LIMIT).map((item) => ({
        id: item.id,
        interviewId: item.interviewId,
        text: item.textContent.slice(0, 280),
      })),
      decisions: decisions.slice(0, 8).map((item) => ({
        id: item.id,
        statement: typeof item.chosen === 'string' ? item.chosen : JSON.stringify(item.chosen),
      })),
      assumptions: assumptions.slice(0, 8).map((item) => ({
        id: item.id,
        statement: item.statement,
      })),
      relations: [
        ...supportLinks.map((item) => ({
          recordItemId: item.recordItemId,
          targetKind: item.targetKind,
          targetId: item.targetId,
          relationType: item.relationType,
        })),
      ],
      memory:
        latestMemory === undefined
          ? null
          : {
              id: latestMemory.id,
              kind: latestMemory.kind,
              body: latestMemory.body,
              stale: latestMemory.stale,
            },
      recentMessages: messages.map((item) => ({
        actor: item.actor,
        text: item.text.slice(0, 500),
      })),
      retrieval: [],
      omitted,
      selectionRationale:
        'Included current stage, record items with ids, pending proposals, active steps, recent messages, and a compact memory summary. Raw documents and full transcripts were omitted.',
      contextChars: 0,
      correlationId: actor.correlationId,
      allowedCapabilities: [...CAPABILITY_IDS],
      capabilityBudget: { maxInvocations: 8, remaining: 8 },
    };
    const parsed = CofounderContextEnvelopeSchema.parse(envelope);
    return {
      ...parsed,
      contextChars: JSON.stringify(parsed).length,
    };
  });
}
