import { type StreamBus } from '@foundry/agent-runtime';
import { insertConversationMessage, withWorkspaceScope, type PoolSql } from '@foundry/db';
import type { Project, UserId, WorkspaceMembership } from '@foundry/domain';

export class InitialDraftService {
  constructor(
    private readonly sql: PoolSql,
    private readonly streamBus: StreamBus,
  ) {}

  async generate(actor: {
    userId: UserId;
    membership: WorkspaceMembership;
    project: Project;
    founderPitch?: string;
  }): Promise<void> {
    const idea = (actor.founderPitch ?? actor.project.name).trim();
    const messageText =
      idea.length === 0
        ? 'I captured an Idea-stage record with empty sections. Nothing here is a completed plan or a validated fact. The recommended next step is to write the idea in your own words.'
        : `I recorded your idea as founder input and left the rest of the business record empty on purpose. No research sprint, score, or 17-section plan was generated. Recommended next step: name the recurring problem without inventing a customer.`;
    await withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const message = await insertConversationMessage(tx, {
        projectId: actor.project.id,
        actor: 'co_founder',
        text: messageText,
        blocks: [{ kind: 'concise_answer', text: messageText }],
      });
      await this.streamBus.publish(actor.project.id, {
        type: 'conversation_message_appended',
        messageId: message.id,
        actor: 'co_founder',
      });
    });
  }
}
