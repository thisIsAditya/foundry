import type { StreamBus } from '@foundry/agent-runtime';
import {
  getCurrentMoneyRules,
  getLatestPlanScoreByPackRevisionId,
  getPackSection,
  insertPlanScore,
  listAlternativesByProjectId,
  listAssumptionsByProjectId,
  listBeachheadsByPackRevisionId,
  listCompetitorsByProjectId,
  listDmusByPackRevisionId,
  listEvidenceItemsByProjectId,
  listGatesByProjectId,
  listInterviewsByProjectId,
  listMarketModelsByPackRevisionId,
  listMetricDefinitionsByProjectId,
  listMetricObservationsByProjectId,
  listPersonasByPackRevisionId,
  listPlanScoresByProjectId,
  listProblemsByPackRevisionId,
  listQuotesByInterviewIds,
  listUnitEconomicsByPackRevisionId,
  listWedgesByPackRevisionId,
  listWtpEventsByProjectId,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import type {
  GateResult,
  GateType,
  PackRevisionId,
  PlanScore,
  Project,
  ScoreDimension,
} from '@foundry/domain';
import {
  evaluateGateA,
  evaluateGateB,
  evaluateGateC,
  evaluateMvbpScope,
  reconcileMoneyIdentities,
} from '@foundry/policy';
import { calculateScore, SCORE_RULE_VERSION } from '@foundry/scoring';
import { limits } from '@foundry/config/limits';
import { randomUUID } from 'node:crypto';

import type { JobQueue } from '../queue/job-queue';

export class ScoringService {
  constructor(
    private readonly sql: PoolSql,
    private readonly streamBus: StreamBus,
    private readonly jobQueue?: JobQueue,
  ) {}

  async recalculate(project: Project): Promise<PlanScore | null> {
    const revisionId = project.currentPackRevisionId;
    if (revisionId === null) {
      return null;
    }
    return withWorkspaceScope(this.sql, [project.workspaceId], async (tx) => {
      const previous = await getLatestPlanScoreByPackRevisionId(tx, revisionId);
      const interviews = await listInterviewsByProjectId(tx, project.id);
      const quotes = await listQuotesByInterviewIds(
        tx,
        interviews.map((item) => item.id),
      );
      const beachheads = await listBeachheadsByPackRevisionId(tx, revisionId);
      const dmus = await listDmusByPackRevisionId(tx, revisionId);
      const problems = await listProblemsByPackRevisionId(tx, revisionId);
      const personas = await listPersonasByPackRevisionId(tx, revisionId);
      const alternatives = await listAlternativesByProjectId(tx, project.id);
      const competitors = await listCompetitorsByProjectId(tx, project.id);
      const marketModels = await listMarketModelsByPackRevisionId(tx, revisionId);
      const wedges = await listWedgesByPackRevisionId(tx, revisionId);
      const evidenceItems = await listEvidenceItemsByProjectId(tx, project.id);
      const assumptions = await listAssumptionsByProjectId(tx, project.id);
      const moneyRules = await getCurrentMoneyRules(tx, project.id);
      const unitEconomicsModels = await listUnitEconomicsByPackRevisionId(tx, revisionId);
      const wtpEvents = await listWtpEventsByProjectId(tx, project.id);
      const metricDefinitions = await listMetricDefinitionsByProjectId(tx, project.id);
      const metricObservations = await listMetricObservationsByProjectId(tx, project.id);
      const gates = await listGatesByProjectId(tx, project.id);
      const mvbp = await getPackSection(tx, revisionId, 'mvbp');
      const legal = await getPackSection(tx, revisionId, 'legal');
      const mvbpBody = mvbp?.body;
      const scoped =
        mvbpBody !== undefined && 'featureCount' in mvbpBody
          ? evaluateMvbpScope({
              hypothesis: mvbpBody.hypothesis,
              featureCount: mvbpBody.featureCount,
              paymentPath: mvbpBody.paymentPath,
            })
          : null;
      const gateAStored = latestGateResult(gates, 'gate_a');
      const gateA =
        gateAStored ??
        evaluateGateA({
          interviews,
          quotes,
          beachheads,
          dmus,
        }).result;
      const gateBStored = latestGateResult(gates, 'gate_b');
      const gateB = gateBStored ?? evaluateGateB({ events: wtpEvents }).result;
      const gateCStored = latestGateResult(gates, 'gate_c');
      const gateC =
        gateCStored ??
        evaluateGateC({ definitions: metricDefinitions, observations: metricObservations }).result;
      const moneyList = moneyRules === null ? [] : [moneyRules];
      const computedMarket =
        marketModels.find((item) => item.computedResult !== null)?.computedResult ?? null;
      const moneyReconciliationWarningCount =
        moneyRules === null
          ? 0
          : reconcileMoneyIdentities({
              moneyRules,
              market: computedMarket,
            }).length;
      const calculated = calculateScore(
        {
          packRevisionId: revisionId,
          problems,
          beachheads,
          personas,
          dmus,
          alternatives,
          competitors,
          marketModels,
          wedges,
          interviews,
          quotes,
          evidenceItems,
          citations: [],
          assumptions,
          moneyRules: moneyList,
          unitEconomicsModels,
          wtpEvents,
          metricDefinitions,
          metricObservations,
          killLineCount:
            mvbpBody !== undefined && 'killLines' in mvbpBody ? mvbpBody.killLines.length : 0,
          legalItemCount:
            legal?.body !== undefined && 'items' in legal.body ? legal.body.items.length : 0,
          moneyReconciliationWarningCount,
          mvbpScopePassed: scoped?.result === 'passed',
          gateA,
          gateB,
          gateC,
        },
        SCORE_RULE_VERSION,
      );
      const stored = await insertPlanScore(tx, {
        packRevisionId: revisionId,
        overall: calculated.overall,
        dimensions: calculated.dimensions,
        ruleVersion: calculated.ruleVersion,
        reasons: calculated.reasons,
        topActions: calculated.topActions,
      });
      const deltaFromPrevious = previous === null ? null : stored.overall - previous.overall;
      await this.streamBus.publish(project.id, {
        type: 'score_changed',
        projectId: project.id,
        revisionId,
        overall: stored.overall,
        dimensions: stored.dimensions,
        deltaFromPrevious,
      });
      if (
        this.jobQueue !== undefined &&
        deltaFromPrevious !== null &&
        Math.abs(deltaFromPrevious) >= limits.notification.scoreMaterialChangePoints
      ) {
        await this.jobQueue.enqueueNotification({
          kind: 'score_changed_materially',
          projectId: project.id,
          workspaceId: project.workspaceId,
          correlationId: randomUUID(),
        });
      }
      return stored;
    });
  }

  async getCurrent(project: Project): Promise<PlanScore | null> {
    if (project.currentPackRevisionId === null) {
      return null;
    }
    return withWorkspaceScope(this.sql, [project.workspaceId], async (tx) =>
      getLatestPlanScoreByPackRevisionId(tx, project.currentPackRevisionId as PackRevisionId),
    );
  }

  async getForRevision(
    workspaceId: Project['workspaceId'],
    revisionId: PackRevisionId,
  ): Promise<PlanScore | null> {
    return withWorkspaceScope(this.sql, [workspaceId], async (tx) =>
      getLatestPlanScoreByPackRevisionId(tx, revisionId),
    );
  }

  async getHistory(project: Project, limit: number): Promise<PlanScore[]> {
    return withWorkspaceScope(this.sql, [project.workspaceId], async (tx) =>
      listPlanScoresByProjectId(tx, project.id, limit),
    );
  }

  async explain(project: Project, dimension: ScoreDimension): Promise<PlanScore['reasons']> {
    const current = await this.getCurrent(project);
    if (current === null) {
      return [];
    }
    return current.reasons.filter((item) => item.dimension === dimension);
  }
}

function latestGateResult(
  gates: { gateType: GateType; result: GateResult }[],
  type: GateType,
): GateResult | null {
  return gates.find((item) => item.gateType === type)?.result ?? null;
}
