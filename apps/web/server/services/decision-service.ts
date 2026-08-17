import type { RecordDecisionInput } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  insertDecision,
  listDecisionsByProjectId,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import type { Decision, Project, UserId, WorkspaceMembership } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';

export class DecisionService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
  ) {}

  async list(actor: { membership: WorkspaceMembership; project: Project }): Promise<Decision[]> {
    if (!this.policyService.can(actor.membership, 'approval.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot list decisions.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      listDecisionsByProjectId(tx, actor.project.id),
    );
  }

  async record(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: RecordDecisionInput,
  ): Promise<Decision> {
    if (!this.policyService.can(actor.membership, 'decision.record')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot record decisions.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:decision.record:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as Decision,
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
          insertDecision(tx, {
            projectId: actor.project.id,
            options: input.options,
            chosen: input.chosen,
            ...(input.rationale === undefined ? {} : { rationale: input.rationale }),
            ...(input.evidenceRefs === undefined ? {} : { evidenceRefs: input.evidenceRefs }),
            decidedByUserId: actor.userId,
          }),
        ),
    );
  }
}
