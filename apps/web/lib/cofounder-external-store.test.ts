import { ConversationMessageSchema } from '@foundry/domain';
import { describe, expect, it } from 'vitest';

import { toExternalThreadMessage } from './cofounder-external-store';

describe('toExternalThreadMessage', () => {
  it('maps founder and co-founder messages without inventing business state', () => {
    const founder = ConversationMessageSchema.parse({
      id: '00000000-0000-4000-8000-000000000001',
      projectId: '00000000-0000-4000-8000-000000000002',
      actor: 'founder',
      actorUserId: '00000000-0000-4000-8000-000000000003',
      text: 'Cafe owners lose two hours closing the books.',
      blocks: [{ kind: 'concise_answer', text: 'Cafe owners lose two hours closing the books.' }],
      references: [],
      visibility: 'founder_visible',
      createdAt: new Date('2026-08-22T00:00:00.000Z'),
    });
    const cofounder = ConversationMessageSchema.parse({
      ...founder,
      id: '00000000-0000-4000-8000-000000000004',
      actor: 'co_founder',
      actorUserId: null,
      text: 'What is the painful job to be done?',
      blocks: [],
    });
    expect(toExternalThreadMessage(founder)).toMatchObject({
      role: 'user',
      content: [{ type: 'text', text: founder.text }],
    });
    expect(toExternalThreadMessage(cofounder).role).toBe('assistant');
  });
});
