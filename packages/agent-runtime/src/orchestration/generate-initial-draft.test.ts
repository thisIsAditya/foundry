import { describe, expect, it } from 'vitest';

import { buildInitialDraft } from './generate-initial-draft.js';

describe('buildInitialDraft', () => {
  it('does not invent customers or prices and marks unknown sections as open questions', () => {
    const draft = buildInitialDraft({
      founderText: 'Cafe owners lose two hours closing the books every night.',
      geography: 'India',
    });
    expect(draft.sections).toHaveLength(17);
    expect(draft.sections.every((item) => !/₹|INR 499|Acme Cafe/.test(item.summary))).toBe(true);
    const problem = draft.sections.find((item) => item.key === 'problem');
    expect(problem?.provenance).toBe('founder_input');
    expect(
      draft.sections.filter((item) => item.provenance === 'open_question').length,
    ).toBeGreaterThan(10);
  });
});
