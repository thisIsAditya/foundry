import type { DefineMetricInput, RecordMetricObservationInput } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  getMetricDefinitionById,
  insertGate,
  insertMetricDefinition,
  insertMetricObservation,
  listMetricDefinitionsByProjectId,
  listMetricObservationsByProjectId,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import type {
  Gate,
  MetricDefinition,
  MetricObservation,
  Project,
  UserId,
  WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { evaluateGateC, PolicyService, type GateCEvaluation } from '@foundry/policy';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';

export class MetricService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
  ) {}

  async listDefinitions(actor: {
    membership: WorkspaceMembership;
    project: Project;
  }): Promise<MetricDefinition[]> {
    if (!this.policyService.can(actor.membership, 'metric.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read metrics.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      listMetricDefinitionsByProjectId(tx, actor.project.id),
    );
  }

  async listObservations(actor: {
    membership: WorkspaceMembership;
    project: Project;
  }): Promise<MetricObservation[]> {
    if (!this.policyService.can(actor.membership, 'metric.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read metric observations.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      listMetricObservationsByProjectId(tx, actor.project.id),
    );
  }

  async define(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: DefineMetricInput,
  ): Promise<MetricDefinition> {
    if (!this.policyService.can(actor.membership, 'metric.write')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot define metrics.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:metric.define:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as MetricDefinition,
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
          insertMetricDefinition(tx, {
            projectId: actor.project.id,
            name: input.name,
            unit: input.unit,
            calculationSpec: input.calculationSpec,
          }),
        ),
    );
  }

  async recordObservation(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: RecordMetricObservationInput,
  ): Promise<MetricObservation> {
    if (!this.policyService.can(actor.membership, 'metric.write')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot record observations.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:metric.record:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as MetricObservation,
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          const definition = await getMetricDefinitionById(tx, input.metricId);
          if (definition === null || definition.projectId !== actor.project.id) {
            throw new AppError({
              code: 'not_found',
              explanation: 'Metric definition not found.',
              nextAction: 'Define the metric before recording observations.',
            });
          }
          return insertMetricObservation(tx, { metricId: definition.id, value: input.value });
        }),
    );
  }

  async evaluateGateC(actor: {
    membership: WorkspaceMembership;
    project: Project;
  }): Promise<{ evaluation: GateCEvaluation; gate: Gate }> {
    if (!this.policyService.can(actor.membership, 'metric.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot evaluate Gate C.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const definitions = await listMetricDefinitionsByProjectId(tx, actor.project.id);
      const observations = await listMetricObservationsByProjectId(tx, actor.project.id);
      const evaluation = evaluateGateC({ definitions, observations });
      const gate = await insertGate(tx, {
        projectId: actor.project.id,
        gateType: 'gate_c',
        ruleVersion: evaluation.ruleVersion,
        inputs: { checks: evaluation.checks },
        result: evaluation.result,
      });
      return { evaluation, gate };
    });
  }
}
