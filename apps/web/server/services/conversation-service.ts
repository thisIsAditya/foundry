import { listConversationMessagesPage, withWorkspaceScope, type PoolSql } from '@foundry/db';
import type { ConversationMessage, Project, WorkspaceMembership } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';

export class ConversationService {
  constructor(
    private readonly sql: PoolSql,
    private readonly policyService: PolicyService,
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
    const items = await withWorkspaceScope(this.sql, [actor.project.workspaceId], (tx) =>
      listConversationMessagesPage(tx, actor.project.id, {
        ...(input.cursor === undefined ? {} : { cursor: input.cursor }),
        limit: input.limit,
      }),
    );
    return {
      items,
      nextCursor: items.length === input.limit ? (items[items.length - 1]?.id ?? null) : null,
    };
  }
}
