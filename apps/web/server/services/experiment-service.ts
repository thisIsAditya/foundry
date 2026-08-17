import type { CreateExperimentInput, RecordWtpEventInput } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  getExperimentById,
  insertExperiment,
  insertGate,
  insertWtpEvent,
  listWtpEventsByProjectId,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  ExperimentIdSchema,
  type Experiment,
  type Gate,
  type Project,
  type UserId,
  type WorkspaceMembership,
  type WtpEvent,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { evaluateGateB, PolicyService, type GateBEvaluation } from '@foundry/policy';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';
import type { ScoringService } from './scoring-service';

export class ExperimentService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
    private readonly scoringService?: ScoringService,
  ) {}

  async create(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: CreateExperimentInput,
  ): Promise<Experiment> {
    if (!this.policyService.can(actor.membership, 'money.write')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot create experiments.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:experiment.create:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as Experiment,
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
          insertExperiment(tx, {
            projectId: actor.project.id,
            hypothesis: input.hypothesis,
            method: input.method,
            threshold: input.threshold,
          }),
        ),
    );
  }

  async recordWtp(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: RecordWtpEventInput,
  ): Promise<WtpEvent> {
    if (!this.policyService.can(actor.membership, 'money.write')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot record WTP events.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:wtp.record:${input.idempotencyKey}`;
    const recorded = await withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as WtpEvent,
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          if (input.experimentId !== undefined) {
            const experiment = await getExperimentById(
              tx,
              ExperimentIdSchema.parse(input.experimentId),
            );
            if (experiment === null || experiment.projectId !== actor.project.id) {
              throw new AppError({
                code: 'not_found',
                explanation: 'Experiment not found.',
                nextAction: 'Create the experiment first.',
              });
            }
          }
          return insertWtpEvent(tx, {
            projectId: actor.project.id,
            ...(input.experimentId === undefined
              ? {}
              : { experimentId: ExperimentIdSchema.parse(input.experimentId) }),
            participantClass: input.participantClass,
            instrument: input.instrument,
            ...(input.amount === undefined ? {} : { amount: input.amount }),
            ...(input.currency === undefined ? {} : { currency: input.currency }),
          });
        }),
    );
    await this.scoringService?.recalculate(actor.project);
    return recorded;
  }

  async listWtp(actor: { membership: WorkspaceMembership; project: Project }): Promise<WtpEvent[]> {
    if (!this.policyService.can(actor.membership, 'money.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read WTP events.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      listWtpEventsByProjectId(tx, actor.project.id),
    );
  }

  async evaluateGateB(actor: {
    membership: WorkspaceMembership;
    project: Project;
  }): Promise<{ evaluation: GateBEvaluation; gate: Gate }> {
    if (!this.policyService.can(actor.membership, 'money.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot evaluate Gate B.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const events = await listWtpEventsByProjectId(tx, actor.project.id);
      const evaluation = evaluateGateB({ events });
      const gate = await insertGate(tx, {
        projectId: actor.project.id,
        gateType: 'gate_b',
        ruleVersion: evaluation.ruleVersion,
        inputs: {
          countedEventIds: evaluation.countedEventIds,
          checks: evaluation.checks,
        },
        result: evaluation.result,
      });
      return { evaluation, gate };
    });
  }
}
