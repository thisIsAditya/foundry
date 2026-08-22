import { describe, expect, it } from 'vitest';

import { ConversationBlockSchema, toCofounderTurnBlock } from './conversation-message.js';
import { CofounderOperationIdSchema } from '../ids.js';

describe('ConversationBlockSchema', () => {
  it('rejects a cited_finding without citation ids', () => {
    expect(
      ConversationBlockSchema.safeParse({
        kind: 'cited_finding',
        text: 'Independent operators already pay for this.',
        citationIds: [],
      }).success,
    ).toBe(false);
    expect(
      ConversationBlockSchema.safeParse({
        kind: 'cited_finding',
        text: 'Independent operators already pay for this.',
        citationIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
      }).success,
    ).toBe(true);
  });

  it('persists a typed co-founder turn without inferring semantics from markdown', () => {
    const block = toCofounderTurnBlock({
      interactionType: 'ask',
      explanation: 'What is the painful job to be done?',
      uncertainty: 'No customer interviews yet.',
      blockedConditions: [],
      activity: 'Asked one clarifying question.',
      proposalId: null,
      stepId: null,
      operationId: CofounderOperationIdSchema.parse('00000000-0000-4000-8000-000000000099'),
      references: [{ kind: 'record', id: 'customer' }],
    });
    expect(ConversationBlockSchema.parse(block).kind).toBe('cofounder_turn');
    expect(block.schemaVersion).toBe('v4.p2.1');
    expect(
      ConversationBlockSchema.safeParse({
        kind: 'cofounder_turn',
        schemaVersion: 'v0',
        interactionType: 'ask',
        explanation: 'What is the painful job to be done?',
        uncertainty: 'Unknown',
        blockedConditions: [],
        activity: 'Asked',
        proposalId: null,
        stepId: null,
        operationId: '00000000-0000-4000-8000-000000000099',
        references: [],
      }).success,
    ).toBe(false);
  });
});
