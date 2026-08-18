import {
  extractPreferences,
  resolveWorkspaceModel,
  runCofounderTurn,
  shouldSummarizeConversation,
  summarizeConversation,
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
  insertConversationMessage,
  insertConversationSummary,
  listConversationMessagesByProjectId,
  listConversationMessagesPage,
  listFounderPreferencesByProjectId,
  listEvidenceItemsByIds,
  listFounderTasksByProjectId,
  listProviderConnectionsByWorkspaceId,
  listSprintsByProjectId,
  upsertFounderPreference,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import type {
  ConversationMessage,
  ConversationSummary,
  EvidenceItemId,
  FounderPreference,
  FounderPreferenceId,
  Project,
  UserId,
  WorkspaceId,
  WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import type { LanguageModel } from 'ai';
import { randomUUID } from 'node:crypto';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';
import { ensurePackRevision, loadPackSnapshot } from './pack-snapshot';
import type { FounderTaskService } from './founder-task-service';
import type { ScoringService } from './scoring-service';
import type { SprintService } from './sprint-service';

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
    const turn = await runCofounderTurn({
      runId,
      founderText: input.text,
      snapshot,
      model: resolved.model,
      timeoutMs,
      effort: input.effort,
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
      const packSnapshot = await loadPackSnapshot(tx, project);
      const [messages, summary, preferences, tasks, sprints, score, attached] = await Promise.all([
        listConversationMessagesByProjectId(tx, actor.project.id),
        getLatestConversationSummaryByProjectId(tx, actor.project.id),
        listFounderPreferencesByProjectId(tx, actor.project.id),
        listFounderTasksByProjectId(tx, actor.project.id),
        listSprintsByProjectId(tx, actor.project.id),
        getLatestPlanScoreByPackRevisionId(tx, pack.id),
        listEvidenceItemsByIds(tx, attachmentIds),
      ]);
      return {
        ...packSnapshot,
        recentMessages: messages,
        conversationSummary: summary,
        confirmedPreferences: preferences.filter((item) => item.founderConfirmed),
        planScore: score,
        openFounderTasks: tasks.filter(
          (item) => item.status === 'proposed' || item.status === 'active',
        ),
        recentJobs: sprints.slice(0, 10).map((sprint) => toAiJobSummary({ sprint })),
        attachedEvidence: attached
          .filter((item) => item.projectId === actor.project.id)
          .map((item) => ({ id: item.id, summary: item.summary })),
      };
    });
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
        const summarized = await summarizeConversation({ messages: uncovered, model, timeoutMs });
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
  ): Promise<{ model: LanguageModel; providerFamily: string | null }> {
    if (this.runtime.languageModel !== undefined) {
      return { model: this.runtime.languageModel, providerFamily: null };
    }
    const connections = await withWorkspaceScope(this.sql, [workspaceId], async (tx) =>
      listProviderConnectionsByWorkspaceId(tx, workspaceId),
    );
    const resolved = await resolveWorkspaceModel({
      connections,
      secrets: this.runtime.secrets,
      secretBox: this.runtime.secretBox,
    });
    return { model: resolved.model, providerFamily: resolved.connection.providerFamily };
  }
}
