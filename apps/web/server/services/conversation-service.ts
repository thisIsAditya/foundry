import {
  extractPreferences,
  loadUserMcpTools,
  resolveWorkspaceModel,
  runCofounderTurn,
  shouldSummarizeConversation,
  summarizeConversation,
  type ContextJobSummary,
  type ProviderSecrets,
  type SecretBox,
  type StreamBus,
} from '@foundry/agent-runtime';
import type { SendConversationInput } from '@foundry/api-contracts';
import { toAiJobSummary } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  confirmFounderPreference,
  correctFounderPreference,
  getFounderPreferenceById,
  getLatestConversationSummaryByProjectId,
  getLatestPlanScoreByPackRevisionId,
  getPackRevisionBySourceSprintId,
  insertConversationMessage,
  insertConversationSummary,
  listConversationMessagesByProjectId,
  listConversationMessagesPage,
  listEnabledUserMcpServersByUserId,
  listFounderPreferencesByProjectId,
  listEvidenceItemsByIds,
  listFounderTasksByProjectId,
  listProviderConnectionsByWorkspaceId,
  listResearchFindingsByJobId,
  listSprintsByProjectId,
  upsertFounderPreference,
  withWorkspaceScope,
  type PoolSql,
  type Sql,
} from '@foundry/db';
import {
  deriveJourneyPhase,
  type ConversationMessage,
  type ConversationSummary,
  type EvidenceItemId,
  type FounderPreference,
  type FounderPreferenceId,
  type Project,
  type UserId,
  type WorkspaceId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { getLogger } from '@foundry/observability';
import { evaluateGateA, PolicyService } from '@foundry/policy';
import type { LanguageModel } from 'ai';
import { randomUUID } from 'node:crypto';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';
import { ensurePackRevision, loadPackSnapshot } from './pack-snapshot';
import type { FounderTaskService } from './founder-task-service';
import type { PlanSectionAggregatorService } from './plan-section-aggregator';
import type { ScoringService } from './scoring-service';
import type { SprintService } from './sprint-service';

const SYNTHESIS_EXCERPT_MAX_CHARS = 500;
const logger = getLogger();

export type ConversationSendResult = {
  runId: string;
  text: string;
  founderMessage: ConversationMessage;
  cofounderMessage: ConversationMessage;
};

export type ConversationRuntimeDeps = {
  streamBus: StreamBus;
  secretBox: SecretBox;
  secrets: ProviderSecrets;
  languageModel?: LanguageModel;
  allowMcpLoopback?: boolean;
};

export class ConversationService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
    private readonly runtime: ConversationRuntimeDeps,
    private readonly sprintService: SprintService,
    private readonly founderTaskService: FounderTaskService,
    private readonly scoringService: ScoringService,
    private readonly planSectionAggregator: PlanSectionAggregatorService,
  ) {}

  async list(
    actor: { membership: WorkspaceMembership; project: Project },
    input: { cursor?: ConversationMessage['id']; limit: number },
  ): Promise<{ items: ConversationMessage[]; nextCursor: ConversationMessage['id'] | null }> {
    if (!this.policyService.can(actor.membership, 'project.list')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read the conversation.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const items = await withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      listConversationMessagesPage(tx, actor.project.id, {
        ...(input.cursor === undefined ? {} : { cursor: input.cursor }),
        limit: input.limit,
      }),
    );
    const nextCursor = items.length === input.limit ? (items[items.length - 1]?.id ?? null) : null;
    return { items, nextCursor };
  }

  async getSummary(actor: {
    membership: WorkspaceMembership;
    project: Project;
  }): Promise<ConversationSummary | null> {
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      getLatestConversationSummaryByProjectId(tx, actor.project.id),
    );
  }

  async listPreferences(actor: {
    membership: WorkspaceMembership;
    project: Project;
  }): Promise<FounderPreference[]> {
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      listFounderPreferencesByProjectId(tx, actor.project.id),
    );
  }

  async confirmPreference(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    preferenceId: FounderPreferenceId,
    idempotencyKey: string,
  ): Promise<FounderPreference> {
    const key = `idem:${actor.userId}:conversation.confirmPreference:${idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as FounderPreference,
      (value) => superjson.stringify(value),
      async () => this.updatePreference(actor, preferenceId, 'confirm'),
    );
  }

  async correctPreference(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    preferenceId: FounderPreferenceId,
    value: unknown,
    idempotencyKey: string,
  ): Promise<FounderPreference> {
    const key = `idem:${actor.userId}:conversation.correctPreference:${idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as FounderPreference,
      (value) => superjson.stringify(value),
      async () => this.updatePreference(actor, preferenceId, 'correct', value),
    );
  }

  async send(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: SendConversationInput,
    correlationId: string,
  ): Promise<ConversationSendResult> {
    if (!this.policyService.can(actor.membership, 'project.answer')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot send conversation messages.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:conversation.send:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as ConversationSendResult,
      (value) => superjson.stringify(value),
      async () => this.runSend(actor, input, correlationId),
    );
  }

  private async runSend(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: SendConversationInput,
    correlationId: string,
  ): Promise<ConversationSendResult> {
    const runId = randomUUID();
    const founderMessage = await withWorkspaceScope(
      this.sql,
      [actor.project.workspaceId],
      async (tx) =>
        insertConversationMessage(tx, {
          projectId: actor.project.id,
          actor: 'founder',
          actorUserId: actor.userId,
          text: input.text,
          blocks: [{ kind: 'concise_answer', text: input.text }],
          references: [
            ...(input.sourceId === undefined
              ? []
              : [{ kind: 'source' as const, id: input.sourceId }]),
            ...(input.attachmentIds ?? []).map((id) => ({ kind: 'evidence' as const, id })),
          ],
        }),
    );
    await this.runtime.streamBus.publish(actor.project.id, {
      type: 'conversation_message_appended',
      messageId: founderMessage.id,
      actor: 'founder',
    });
    await this.runtime.streamBus.publish(actor.project.id, {
      type: 'message_started',
      runId,
    });

    const snapshot = await this.assembleSnapshot(actor, input.attachmentIds ?? []);
    const resolved = await this.resolveModel(actor.project.workspaceId);
    const timeoutMs =
      resolved.providerFamily === 'ollama'
        ? limits.interactive.diagnoseTimeoutMsLocal
        : limits.interactive.diagnoseTimeoutMs;
    const readOnlyMcpTools = await this.loadReadOnlyMcpTools(actor.userId, [
      actor.project.workspaceId,
    ]);
    logger.info(
      {
        event: 'cofounder_runtime_ready',
        runId,
        providerFamily: resolved.providerFamily,
        modelId: resolved.modelId,
        effort: input.effort ?? 'standard',
        readOnlyMcpToolNames: Object.keys(readOnlyMcpTools?.tools ?? {}),
      },
      'Cofounder runtime ready',
    );
    const turn = await runCofounderTurn({
      runId,
      founderText: input.text,
      snapshot,
      model: resolved.model,
      timeoutMs,
      effort: input.effort,
      ...(readOnlyMcpTools === undefined ? {} : { readOnlyMcpTools }),
      publish: async (event) => {
        if (
          event.type === 'text_delta' ||
          event.type === 'message_started' ||
          event.type === 'message_completed'
        ) {
          return;
        }
        await this.runtime.streamBus.publish(actor.project.id, event);
      },
      actions: {
        previewResearch: async ({ objective, whyNow }) => {
          const previewed = await this.sprintService.preview(actor, {
            projectId: actor.project.id,
            objectiveHint: objective,
            jobKind: 'research',
            whyNow,
            roleLabel: 'Market researcher',
            idempotencyKey: randomUUID(),
          });
          return { jobId: previewed.sprint.id };
        },
        previewJob: async ({ objective, jobKind, whyNow }) => {
          const previewed = await this.sprintService.preview(actor, {
            projectId: actor.project.id,
            objectiveHint: objective,
            jobKind,
            whyNow,
            idempotencyKey: randomUUID(),
          });
          return { jobId: previewed.sprint.id };
        },
        previewDraftRevision: async ({ objective }) => {
          const previewed = await this.sprintService.preview(actor, {
            projectId: actor.project.id,
            objectiveHint: objective,
            jobKind: 'analysis',
            whyNow: 'Propose a pack revision from the latest evidence.',
            roleLabel: 'Analyst',
            idempotencyKey: randomUUID(),
          });
          return { jobId: previewed.sprint.id };
        },
        createFounderTask: async ({ title, explanation }) => {
          const created = await this.founderTaskService.create(actor, { title, explanation });
          return { founderTaskId: created.id, title: created.title };
        },
      },
    });

    const cofounderMessage = await withWorkspaceScope(
      this.sql,
      [actor.project.workspaceId],
      async (tx) =>
        insertConversationMessage(tx, {
          projectId: actor.project.id,
          actor: 'co_founder',
          text: turn.text,
          blocks: turn.blocks,
          references: turn.references,
        }),
    );
    await this.runtime.streamBus.publish(actor.project.id, {
      type: 'text_delta',
      runId,
      delta: turn.text,
    });
    await this.runtime.streamBus.publish(actor.project.id, { type: 'message_completed', runId });
    await this.runtime.streamBus.publish(actor.project.id, {
      type: 'conversation_message_appended',
      messageId: cofounderMessage.id,
      actor: 'co_founder',
    });

    await this.persistExtractedPreferences(actor, founderMessage, resolved.model);
    await this.maybeSummarize(actor, resolved.model, timeoutMs);
    await this.scoringService.recalculate(actor.project).catch(() => undefined);
    void correlationId;
    return { runId, text: turn.text, founderMessage, cofounderMessage };
  }

  private async assembleSnapshot(
    actor: {
      userId: UserId;
      membership: WorkspaceMembership;
      project: Project;
    },
    attachmentIds: readonly EvidenceItemId[],
  ) {
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const pack = await ensurePackRevision(tx, actor.project, actor.userId);
      const project = { ...actor.project, currentPackRevisionId: pack.id };
      const [
        packSnapshot,
        messages,
        summary,
        preferences,
        tasks,
        sprints,
        score,
        attached,
        sectionCards,
      ] = await Promise.all([
        loadPackSnapshot(tx, project),
        listConversationMessagesByProjectId(tx, actor.project.id),
        getLatestConversationSummaryByProjectId(tx, actor.project.id),
        listFounderPreferencesByProjectId(tx, actor.project.id),
        listFounderTasksByProjectId(tx, actor.project.id),
        listSprintsByProjectId(tx, actor.project.id),
        getLatestPlanScoreByPackRevisionId(tx, pack.id),
        listEvidenceItemsByIds(tx, attachmentIds),
        this.planSectionAggregator.listAll(actor),
      ]);
      const gateAEvaluation = evaluateGateA({
        interviews: packSnapshot.interviews,
        quotes: packSnapshot.quotes,
        beachheads: packSnapshot.beachheads,
        dmus: packSnapshot.dmus,
      });
      const derivedPhase = deriveJourneyPhase({
        sections: sectionCards.map((card) => ({ key: card.key, status: card.status })),
        score: score?.dimensions ?? null,
        gateA: { passed: gateAEvaluation.result === 'passed' },
        wtpEventCount: packSnapshot.wtpEvents.length,
      });
      const recentJobs = await this.enrichRecentJobs(tx, sprints.slice(0, 10));
      return {
        ...packSnapshot,
        derivedPhase,
        recentMessages: messages,
        conversationSummary: summary,
        confirmedPreferences: preferences.filter((item) => item.founderConfirmed),
        planScore: score,
        openFounderTasks: tasks.filter(
          (item) => item.status === 'proposed' || item.status === 'active',
        ),
        recentJobs,
        attachedEvidence: attached
          .filter((item) => item.projectId === actor.project.id)
          .map((item) => ({ id: item.id, summary: item.summary })),
      };
    });
  }

  /**
   * Attaches a short excerpt of what each job actually produced — the research finding claim
   * for research jobs, or the draft pack revision's synthesis result for jobs that proposed
   * plan changes — so the co-founder can reason about *what was learned*, not just job status
   * (plan §ContextAssembler "recent jobs... with synthesis text").
   */
  private async enrichRecentJobs(
    tx: Sql,
    sprints: Parameters<typeof toAiJobSummary>[0]['sprint'][],
  ): Promise<ContextJobSummary[]> {
    return Promise.all(
      sprints.map(async (sprint) => {
        const summary = toAiJobSummary({ sprint });
        if (sprint.jobKind === 'research') {
          const findings = await listResearchFindingsByJobId(tx, sprint.id);
          const latest = findings[0];
          return latest === undefined
            ? summary
            : { ...summary, synthesisSummary: latest.claim.slice(0, SYNTHESIS_EXCERPT_MAX_CHARS) };
        }
        const draftRevision = await getPackRevisionBySourceSprintId(tx, sprint.id);
        const result = draftRevision?.proposedChanges;
        const synthesisResult =
          typeof result === 'object' && result !== null && 'result' in result
            ? (result as { result: unknown }).result
            : undefined;
        return typeof synthesisResult === 'string'
          ? { ...summary, synthesisSummary: synthesisResult.slice(0, SYNTHESIS_EXCERPT_MAX_CHARS) }
          : summary;
      }),
    );
  }

  private async persistExtractedPreferences(
    actor: { project: Project },
    founderMessage: ConversationMessage,
    model: LanguageModel,
  ): Promise<void> {
    const extracted = await extractPreferences(founderMessage.text, { model });
    if (extracted.length === 0) {
      return;
    }
    await withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      for (const item of extracted) {
        await upsertFounderPreference(tx, {
          scope: { type: 'project', projectId: actor.project.id },
          key: item.key,
          value: item.value,
          sourceMessageId: founderMessage.id,
          confidence: {
            label: 'inferred',
            basis: 'keyword_match',
            reviewerUserId: null,
            expiresAt: null,
          },
          founderConfirmed: false,
        });
      }
    });
  }

  private async maybeSummarize(
    actor: { project: Project },
    model: LanguageModel,
    timeoutMs: number,
  ): Promise<void> {
    await withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const messages = await listConversationMessagesByProjectId(tx, actor.project.id);
      const latest = await getLatestConversationSummaryByProjectId(tx, actor.project.id);
      const coveredIndex =
        latest === null
          ? -1
          : messages.findIndex((item) => item.id === latest.coveredThroughMessageId);
      const uncovered = coveredIndex === -1 ? messages : messages.slice(coveredIndex + 1);
      if (!shouldSummarizeConversation(uncovered.length) || uncovered.length === 0) {
        return;
      }
      const last = uncovered[uncovered.length - 1];
      if (last === undefined) {
        return;
      }
      try {
        const summarized = await summarizeConversation({
          messages: uncovered,
          model,
          timeoutMs,
          previousSummaryText: latest?.summaryText ?? null,
        });
        await insertConversationSummary(tx, {
          projectId: actor.project.id,
          summaryText: summarized.summaryText,
          coveredThroughMessageId: last.id,
          tokenCount: summarized.tokenCount,
        });
      } catch {
        return;
      }
    });
  }

  private async updatePreference(
    actor: { membership: WorkspaceMembership; project: Project },
    preferenceId: FounderPreferenceId,
    mode: 'confirm' | 'correct',
    value?: unknown,
  ): Promise<FounderPreference> {
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const existing = await getFounderPreferenceById(tx, preferenceId);
      if (existing === null) {
        throw new AppError({
          code: 'not_found',
          explanation: 'Preference not found.',
          nextAction: 'Reload preferences and retry.',
        });
      }
      if (existing.scope.type === 'project' && existing.scope.projectId !== actor.project.id) {
        throw new AppError({
          code: 'not_found',
          explanation: 'Preference not found on this project.',
          nextAction: 'Reload preferences and retry.',
        });
      }
      return mode === 'confirm'
        ? confirmFounderPreference(tx, preferenceId)
        : correctFounderPreference(tx, preferenceId, value);
    });
  }

  private async resolveModel(
    workspaceId: WorkspaceId,
  ): Promise<{ model: LanguageModel; providerFamily: string | null; modelId: string | null }> {
    if (this.runtime.languageModel !== undefined) {
      return { model: this.runtime.languageModel, providerFamily: null, modelId: null };
    }
    const connections = await withWorkspaceScope(this.sql, [workspaceId], async (tx) =>
      listProviderConnectionsByWorkspaceId(tx, workspaceId),
    );
    const resolved = await resolveWorkspaceModel({
      connections,
      secrets: this.runtime.secrets,
      secretBox: this.runtime.secretBox,
    });
    return {
      model: resolved.model,
      providerFamily: resolved.connection.providerFamily,
      modelId: resolved.modelId,
    };
  }

  /** Loads tools only from the founder's `readOnly`-opted-in MCP servers, so the interactive
   * turn can admit them inline (plan §"Closing the loop on the original MCP question") without
   * touching the `side_effect`-only servers that must stay background-job-only. Failures degrade
   * to no MCP tools rather than failing the whole turn. */
  private async loadReadOnlyMcpTools(
    userId: UserId,
    workspaceIds: WorkspaceId[],
  ): Promise<Awaited<ReturnType<typeof loadUserMcpTools>> | undefined> {
    try {
      const servers = await withWorkspaceScope(this.sql, workspaceIds, async (tx) =>
        listEnabledUserMcpServersByUserId(tx, userId),
      );
      const readOnlyServers = servers.filter((server) => server.readOnly);
      if (readOnlyServers.length === 0) {
        return undefined;
      }
      return await loadUserMcpTools(readOnlyServers, {
        box: this.runtime.secretBox,
        ...(this.runtime.allowMcpLoopback === undefined
          ? {}
          : { allowLoopback: this.runtime.allowMcpLoopback }),
      });
    } catch (error) {
      logger.warn(
        {
          event: 'readonly_mcp_load_failed',
          userId,
          workspaceIds,
          errorName: error instanceof Error ? error.name : 'unknown_error',
          errorMessage: error instanceof Error ? error.message : String(error),
        },
        'Read-only MCP loading failed',
      );
      return undefined;
    }
  }
}
