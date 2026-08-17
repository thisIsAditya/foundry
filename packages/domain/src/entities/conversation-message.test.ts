import { describe, expect, it } from 'vitest';

import { ConversationBlockSchema } from './conversation-message.js';

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
});
