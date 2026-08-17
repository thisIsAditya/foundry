import {
  loadUserMcpTools,
  readAgentCapabilities,
  resolveWorkspaceModel,
  runSprint,
  SprintJobDataSchema,
  type ProviderSecrets,
  type ResolveWorkerRuntime,
  type SecretBox,
  type SprintJobData,
  type SprintOutcome,
  type StreamBus,
  type WorkerRuntime,
} from '@foundry/agent-runtime';
import { ALL_TOOLS, TOOL_RISK_CLASSES } from '@foundry/tools';
import {
  completeAgentRun,
  getCurrentAgentDefinition,
  getProjectById,
  getSprintById,
  insertAgentRun,
  insertGate,
  insertResearchFinding,
  insertSprintProgressEvent,
  insertUsageRecord,
  listEnabledUserMcpServersByUserId,
  listProviderConnectionsByWorkspaceId,
  listWorkspaceMembershipsByWorkspaceId,
  updateSprintStatus,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import { PackSectionKeySchema, PackSectionKeyToBusinessModelSectionKey } from '@foundry/domain';

import { loadPackSnapshot } from '../pack-snapshot.js';
import { proposePackRevisionFromSynthesis } from './propose-pack-revision.js';

export type SprintProcessDeps = {
  sql: PoolSql;
  streamBus: StreamBus;
  secretBox: SecretBox;
  secrets: ProviderSecrets;
};

const policyService = new PolicyService();

export async function processSprintJob(
  data: SprintJobData,
  deps: SprintProcessDeps,
): Promise<SprintOutcome> {
  const job = SprintJobDataSchema.parse(data);
  const workspaceIds = [job.workspaceId];

  const resolveWorkerRuntime: ResolveWorkerRuntime = async (worker) => {
    if (worker.name === 'mock_worker') {
      return null;
    }
    const agentDefinition = await getCurrentAgentDefinition(deps.sql, worker.name);
    if (agentDefinition === null) {
      return null;
    }
    const capabilities = readAgentCapabilities(agentDefinition);
    const connections = await withWorkspaceScope(deps.sql, workspaceIds, async (tx) =>
      listProviderConnectionsByWorkspaceId(tx, job.workspaceId),
    );
    if (connections.length === 0) {
      return null;
    }
    let resolved: Awaited<ReturnType<typeof resolveWorkspaceModel>>;
    try {
      resolved = await resolveWorkspaceModel({
        connections,
        secrets: deps.secrets,
        secretBox: deps.secretBox,
      });
    } catch {
      // No healthy, decryptable connection — fall back to the mock worker rather than fail the sprint.
      return null;
    }
    const memberships = await withWorkspaceScope(deps.sql, workspaceIds, async (tx) =>
      listWorkspaceMembershipsByWorkspaceId(tx, job.workspaceId),
    );
    const owner = memberships.find((item) => item.role === 'owner') ?? memberships[0];
    const mcpServers =
      owner === undefined
        ? []
        : await withWorkspaceScope(
            deps.sql,
            workspaceIds,
            async (tx) => listEnabledUserMcpServersByUserId(tx, owner.userId),
            owner.userId,
          );
    const mcpLoaded = await loadUserMcpTools(mcpServers, { box: deps.secretBox });
    const tools = policyService.filterTools(
      { ...ALL_TOOLS, ...mcpLoaded.tools },
      { ...TOOL_RISK_CLASSES, ...mcpLoaded.riskClasses },
      {
        allowlist: capabilities.toolAllowlist,
        maxRiskClass: capabilities.maxToolRiskClass,
      },
    );
    const agentRun = await withWorkspaceScope(deps.sql, workspaceIds, async (tx) =>
      insertAgentRun(tx, {
        sprintId: job.sprintId,
        agentDefinitionId: agentDefinition.id,
        modelProfile: capabilities.modelProfile,
        provider: resolved.connection.providerFamily,
        modelId: resolved.modelId,
      }),
    );
    const runtime: WorkerRuntime = {
      model: resolved.model,
      tools,
      instructions: agentDefinition.instructionsText,
      onUsage: async (usage) => {
        const inputTokens = usage.inputTokens ?? null;
        const outputTokens = usage.outputTokens ?? null;
        await withWorkspaceScope(deps.sql, workspaceIds, async (tx) => {
          await completeAgentRun(tx, agentRun.id, {
            status: 'completed',
            inputTokens,
            outputTokens,
            costUsd: '0',
          });
          await insertUsageRecord(tx, {
            workspaceId: job.workspaceId,
            provider: resolved.connection.providerFamily,
            resourceType: 'model',
            quantity: String((inputTokens ?? 0) + (outputTokens ?? 0)),
            costUsd: '0',
            agentRunId: agentRun.id,
          });
        });
      },
    };
    return runtime;
  };

  const outcome = await runSprint(job, {
    async loadSprint() {
      const sprint = await withWorkspaceScope(deps.sql, workspaceIds, async (tx) =>
        getSprintById(tx, job.sprintId),
      );
      if (sprint === null || sprint.projectId !== job.projectId) {
        throw new AppError({
          code: 'not_found',
          explanation: 'Sprint not found for this job.',
          nextAction: 'Re-preview and approve the sprint.',
          correlationId: job.correlationId,
        });
      }
      return sprint;
    },
    async loadSnapshot() {
      return withWorkspaceScope(deps.sql, workspaceIds, async (tx) => {
        const project = await getProjectById(tx, job.projectId);
        if (project === null) {
          throw new AppError({
            code: 'not_found',
            explanation: 'Project not found for this sprint.',
            nextAction: 'Re-preview and approve the sprint.',
            correlationId: job.correlationId,
          });
        }
        return loadPackSnapshot(tx, { ...project, currentPackRevisionId: job.packRevisionId });
      });
    },
    async publish(event) {
      await deps.streamBus.publish(job.projectId, event);
    },
    async saveProgress(eventType, payload) {
      await withWorkspaceScope(deps.sql, workspaceIds, async (tx) => {
        await insertSprintProgressEvent(tx, {
          sprintId: job.sprintId,
          eventType,
          payload,
        });
      });
    },
    async markRunning() {
      await withWorkspaceScope(deps.sql, workspaceIds, async (tx) => {
        await updateSprintStatus(tx, job.sprintId, 'running');
      });
    },
    async saveGate(evaluation) {
      await withWorkspaceScope(deps.sql, workspaceIds, async (tx) => {
        await insertGate(tx, {
          projectId: job.projectId,
          gateType: 'gate_a',
          ruleVersion: evaluation.ruleVersion,
          inputs: {
            countedInterviewIds: evaluation.countedInterviewIds,
            checks: evaluation.checks,
          },
          result: evaluation.result,
        });
      });
    },
    async close(status, reason) {
      await withWorkspaceScope(deps.sql, workspaceIds, async (tx) => {
        await updateSprintStatus(tx, job.sprintId, status, reason);
      });
    },
    resolveWorkerRuntime,
    async proposePackRevision({ synthesis }) {
      return withWorkspaceScope(deps.sql, workspaceIds, async (tx) =>
        proposePackRevisionFromSynthesis(tx, {
          projectId: job.projectId,
          parentPackRevisionId: job.packRevisionId,
          sprintId: job.sprintId,
          synthesis,
        }),
      );
    },
  });

  const sprint = await withWorkspaceScope(deps.sql, workspaceIds, async (tx) =>
    getSprintById(tx, job.sprintId),
  );
  if (sprint !== null && sprint.jobKind === 'research') {
    const affectedSectionKeys = outcome.synthesis.proposedPackChanges.flatMap((change) => {
      const parsed = PackSectionKeySchema.safeParse(change.targetSection);
      if (!parsed.success) {
        return [];
      }
      const mapped = PackSectionKeyToBusinessModelSectionKey[parsed.data];
      return mapped === undefined ? [] : [mapped];
    });
    await withWorkspaceScope(deps.sql, workspaceIds, async (tx) => {
      await insertResearchFinding(tx, {
        projectId: job.projectId,
        jobId: job.sprintId,
        claim: outcome.synthesis.result.slice(0, 2000),
        confidence: {
          label: 'unverified',
          basis: 'sprint_synthesis',
          reviewerUserId: null,
          expiresAt: null,
        },
        affectedSectionKeys,
        extractionMethod: 'web_search',
      });
    });
  }
  return outcome;
}
