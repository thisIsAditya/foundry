import { describe, expect, it } from 'vitest';

import { ConversationBlockSchema } from '@foundry/domain';

import { InitialDraftSchema } from '../src/contracts/output-schema.js';
import { buildInitialDraft } from '../src/orchestration/generate-initial-draft.js';
import { unresearchedCitedFinding } from './fixtures/adversarial/unresearched-cited-finding.js';
import { initialDraftGoldenPack } from './fixtures/golden-packs/initial-draft-no-unsupported-known.js';

const allowedProvenance = new Set([
  'founder_input',
  'assumption',
  'open_question',
  'not_applicable',
]);

describe('eval: initial draft never marks unsupported sections known or cited', () => {
  it('keeps empty sections as open questions and rejects known/cited provenance', () => {
    const draft = buildInitialDraft(initialDraftGoldenPack);
    expect(draft.sections).toHaveLength(17);
    expect(draft.sections.every((item) => allowedProvenance.has(item.provenance))).toBe(true);
    expect(
      draft.sections.filter((item) => item.provenance === 'open_question').length,
    ).toBeGreaterThan(10);
    const first = draft.sections[0];
    if (first === undefined) {
      throw new Error('expected a first section');
    }
    expect(
      InitialDraftSchema.safeParse({
        ...draft,
        sections: [{ ...first, provenance: 'known' }],
      }).success,
    ).toBe(false);
    expect(
      InitialDraftSchema.safeParse({
        ...draft,
        sections: [{ ...first, provenance: 'cited' }],
      }).success,
    ).toBe(false);
  });
});

describe('eval: adversarial cited finding without citations', () => {
  it('rejects a cited_finding block that has no citationIds', () => {
    expect(ConversationBlockSchema.safeParse(unresearchedCitedFinding.block).success).toBe(false);
    expect(
      ConversationBlockSchema.safeParse({
        kind: 'cited_finding',
        text: unresearchedCitedFinding.block.text,
        citationIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
      }).success,
    ).toBe(true);
  });
});
