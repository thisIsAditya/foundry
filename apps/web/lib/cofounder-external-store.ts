import type { ConversationMessage } from '@foundry/domain';

export type ExternalThreadMessage = {
  id: string;
  role: 'user' | 'assistant';
  createdAt: Date;
  content: [{ type: 'text'; text: string }];
};

export function toExternalThreadMessage(message: ConversationMessage): ExternalThreadMessage {
  return {
    id: message.id,
    role: message.actor === 'founder' ? 'user' : 'assistant',
    createdAt: message.createdAt,
    content: [{ type: 'text', text: message.text }],
  };
}
