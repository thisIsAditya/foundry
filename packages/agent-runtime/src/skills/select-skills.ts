import { generateObject, type LanguageModel } from 'ai';
import { z } from 'zod';

import type { AgentSkill } from './types.js';

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'to',
  'of',
  'for',
  'and',
  'or',
  'is',
  'are',
  'on',
  'in',
  'with',
  'this',
  'that',
  'it',
  'you',
  'your',
  'i',
  'me',
  'my',
  'we',
  'our',
  'be',
  'do',
  'does',
  'can',
  'will',
  'what',
  'how',
  'about',
  'us',
  'as',
  'at',
  'by',
  'from',
  'was',
  'were',
  'have',
  'has',
  'not',
]);

function tokenize(text: string): Set<string> {
  const matches = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return new Set(matches.filter((token) => !STOP_WORDS.has(token) && token.length > 1));
}

export type ScoredSkill = { skill: AgentSkill; score: number };

/**
 * Cheap keyword match: overlap between the query's tokens and each skill's `whenToUse` tokens.
 * No embeddings, no model call — this is the "first pass" the plan calls for, and is usually
 * enough since `whenToUse` is written for keyword overlap, not prose quality.
 */
export function selectSkillsByKeyword(
  query: string,
  registry: readonly AgentSkill[],
  maxSkills = 2,
): ScoredSkill[] {
  const queryTokens = tokenize(query);
  if (queryTokens.size === 0) {
    return [];
  }
  return registry
    .map((skill) => {
      const whenToUseTokens = tokenize(skill.whenToUse);
      let score = 0;
      for (const token of queryTokens) {
        if (whenToUseTokens.has(token)) {
          score += 1;
        }
      }
      return { skill, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSkills);
}

export type SkillClassifier = (input: {
  query: string;
  candidates: readonly AgentSkill[];
}) => Promise<string[]>;

/** A tiny classification call, used only when the keyword pass is ambiguous (plan
 * §select-skills.ts). Kept as a small helper rather than baked into `selectSkills` so tests and
 * cheap `quick`-effort runs can omit it entirely and just get the keyword result. */
export function createSkillClassifier(model: LanguageModel): SkillClassifier {
  return async ({ query, candidates }) => {
    if (candidates.length === 0) {
      return [];
    }
    const ids = candidates.map((skill) => skill.id) as [string, ...string[]];
    const result = await generateObject({
      model,
      schema: z.object({ skillIds: z.array(z.enum(ids)).max(2) }),
      instructions:
        'Pick zero, one, or two skills whose whenToUse best matches the founder message. If none clearly apply, return an empty list.',
      prompt: [
        `Founder message: ${query}`,
        'Candidate skills:',
        ...candidates.map((skill) => `- ${skill.id}: ${skill.whenToUse}`),
      ].join('\n'),
    });
    return result.object.skillIds;
  };
}

export type SelectSkillsInput = {
  query: string;
  registry: readonly AgentSkill[];
  maxSkills?: number;
  /** Only invoked when the keyword pass finds nothing or is tied past `maxSkills`. Omit to skip
   * straight to "no skill selected" in that case (e.g. for `quick`-effort turns that shouldn't
   * spend an extra model call on skill selection). */
  classify?: SkillClassifier;
};

/**
 * Runs the keyword pass first; falls back to `classify` only when that pass is ambiguous
 * (nothing matched, or more candidates tied at the top score than `maxSkills` allows). Selected
 * skills are what `FoundryAgent.run` folds into its `instructions`.
 */
export async function selectSkills(input: SelectSkillsInput): Promise<AgentSkill[]> {
  const maxSkills = input.maxSkills ?? 2;
  const scored = selectSkillsByKeyword(input.query, input.registry, maxSkills);
  const topScore = scored[0]?.score ?? 0;
  const tiedAtTop = scored.filter((entry) => entry.score === topScore);
  const ambiguous = topScore === 0 || tiedAtTop.length > maxSkills;

  if (!ambiguous || input.classify === undefined) {
    return scored.map((entry) => entry.skill);
  }

  const chosenIds = new Set(
    await input.classify({ query: input.query, candidates: input.registry }),
  );
  return input.registry.filter((skill) => chosenIds.has(skill.id)).slice(0, maxSkills);
}
