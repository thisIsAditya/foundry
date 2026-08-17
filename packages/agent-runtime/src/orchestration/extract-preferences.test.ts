import type { LanguageModel } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it } from 'vitest';

import { extractPreferences, extractPreferencesFromText } from './extract-preferences.js';

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

function objectModel(payload: unknown): LanguageModel {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: 'text', text: JSON.stringify(payload) }],
      finishReason: { unified: 'stop' as const, raw: undefined },
      usage,
      warnings: [],
    }),
  });
}

describe('extractPreferencesFromText', () => {
  it('extracts each known preference key without a model call', () => {
    const found = extractPreferencesFromText(
      'We are bootstrapped B2B operators in Pune, conservative, prefer concise evenings updates during business hours.',
    );
    expect(found.map((item) => item.key).sort()).toEqual(
      [
        'availability',
        'budget',
        'communication_style',
        'customer_type',
        'geography',
        'risk_tolerance',
        'working_style',
      ].sort(),
    );
  });
});

describe('extractPreferences', () => {
  it('keeps the rules path when keywords are present', async () => {
    const found = await extractPreferences('Bootstrapped in Pune.', {
      model: objectModel({ preferences: [{ key: 'budget', value: 'should-not-win' }] }),
    });
    expect(found).toEqual([
      { key: 'geography', value: 'pune' },
      { key: 'budget', value: 'bootstrapped' },
    ]);
  });

  it('falls back to structured output when the message is ambiguous', async () => {
    const found = await extractPreferences('We care about how the work feels day to day.', {
      model: objectModel({
        preferences: [{ key: 'communication_style', value: 'short written notes' }],
      }),
    });
    expect(found).toEqual([{ key: 'communication_style', value: 'short written notes' }]);
  });
});
