import { buildCofounderContextEnvelope } from '@foundry/cofounder-operations';
import type { CofounderContextPacket } from '@foundry/agent-runtime';
import type { PoolSql } from '@foundry/db';
import type { Project, UserId, WorkspaceMembership } from '@foundry/domain';
import { PolicyService } from '@foundry/policy';
import { AppError } from '@foundry/observability';

export class ContextService {
  constructor(
    private readonly sql: PoolSql,
    private readonly policyService: PolicyService,
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
    return buildCofounderContextEnvelope(this.sql, actor);
  }
}
