import { describe, expect, it } from 'vitest';

import { selectSkills, selectSkillsByKeyword } from './select-skills.js';
import type { AgentSkill } from './types.js';

const registry: AgentSkill[] = [
  {
    id: 'competitor_research',
    title: 'Competitor research',
    whenToUse: 'competitors competitive landscape alternatives rivals',
    instructions: 'Research competitors from context.',
    toolAllowlistAdditions: ['academic_search'],
  },
  {
    id: 'pricing_analyst',
    title: 'Pricing analyst',
    whenToUse: 'pricing packaging unit economics ltv cac',
    instructions: 'Use calculators, never compute in prose.',
  },
];

describe('selectSkillsByKeyword', () => {
  it('ranks the skill with the most token overlap first', () => {
    const scored = selectSkillsByKeyword('Can you research our competitors?', registry);
    expect(scored[0]?.skill.id).toBe('competitor_research');
  });

  it('returns nothing when no skill overlaps the query', () => {
    const scored = selectSkillsByKeyword('What is the capital of France?', registry);
    expect(scored).toEqual([]);
  });
});

describe('selectSkills', () => {
  it('returns the keyword match without calling the classifier', async () => {
    let classifyCalls = 0;
    const selected = await selectSkills({
      query: 'Can you research our competitors?',
      registry,
      classify: async () => {
        classifyCalls += 1;
        return [];
      },
    });
    expect(selected.map((skill) => skill.id)).toEqual(['competitor_research']);
    expect(classifyCalls).toBe(0);
  });

  it('falls back to the classifier when the keyword pass finds nothing', async () => {
    const selected = await selectSkills({
      query: 'What is the capital of France?',
      registry,
      classify: async () => ['pricing_analyst'],
    });
    expect(selected.map((skill) => skill.id)).toEqual(['pricing_analyst']);
  });

  it('returns no skills when ambiguous and no classifier is provided', async () => {
    const selected = await selectSkills({ query: 'What is the capital of France?', registry });
    expect(selected).toEqual([]);
  });
});
