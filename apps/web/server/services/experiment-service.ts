import type { CreateExperimentInput } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import { insertExperiment, withWorkspaceScope, type PoolSql } from '@foundry/db';
import type { Experiment, Project, UserId, WorkspaceMembership } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';

export class ExperimentService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
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
    return withIdempotency(
      this.coordination,
      `idem:${actor.userId}:experiment.create:${input.idempotencyKey}`,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as Experiment,
      (value) => superjson.stringify(value),
      () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], (tx) =>
          insertExperiment(tx, {
            projectId: actor.project.id,
            hypothesis: input.hypothesis,
            method: input.method,
            threshold: input.threshold,
          }),
        ),
    );
  }
}
