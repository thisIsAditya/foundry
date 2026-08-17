import type { LanguageModel } from 'ai';
import { generateObject } from 'ai';
import { z } from 'zod';

export type ExtractedPreference = {
  key: string;
  value: string;
};

const PreferenceKeySchema = z.enum([
  'geography',
  'budget',
  'risk_tolerance',
  'communication_style',
  'working_style',
  'availability',
  'customer_type',
]);

const PreferenceExtractionSchema = z.object({
  preferences: z.array(
    z.object({
      key: PreferenceKeySchema,
      value: z.string().min(1),
    }),
  ),
});

const PREFERENCE_MATCHERS: { key: string; pattern: RegExp; value: (match: string) => string }[] = [
  {
    key: 'geography',
    pattern: /\b(india|indian|pune|mumbai|delhi|bengaluru|bangalore|hyderabad|chennai)\b/i,
    value: (match) => match.toLowerCase(),
  },
  {
    key: 'budget',
    pattern: /\b(bootstrap|bootstrapped|frugal|low.?budget|runway)\b/i,
    value: (match) => match.toLowerCase(),
  },
  {
    key: 'risk_tolerance',
    pattern: /\b(conservative|cautious|aggressive|high.?risk)\b/i,
    value: (match) => match.toLowerCase(),
  },
  {
    key: 'communication_style',
    pattern: /\b(brief|concise|detailed|bullet.?points)\b/i,
    value: (match) => match.toLowerCase(),
  },
  {
    key: 'working_style',
    pattern: /\b(evenings|weekends|async|daily.?check.?in)\b/i,
    value: (match) => match.toLowerCase(),
  },
  {
    key: 'customer_type',
    pattern: /\b(smb|sme|enterprise|consumer|b2b|b2c)\b/i,
    value: (match) => match.toLowerCase(),
  },
  {
    key: 'availability',
    pattern: /\b(mornings|afternoons|business.?hours|office.?hours)\b/i,
    value: (match) => match.toLowerCase(),
  },
];

export function extractPreferencesFromText(text: string): ExtractedPreference[] {
  const found: ExtractedPreference[] = [];
  for (const matcher of PREFERENCE_MATCHERS) {
    const match = text.match(matcher.pattern);
    if (match?.[0] !== undefined) {
      found.push({ key: matcher.key, value: matcher.value(match[0]) });
    }
  }
  return found;
}

export async function extractPreferences(
  text: string,
  options?: { model?: LanguageModel; timeoutMs?: number },
): Promise<ExtractedPreference[]> {
  const fromRules = extractPreferencesFromText(text);
  if (fromRules.length > 0 || options?.model === undefined) {
    return fromRules;
  }
  try {
    const generated = await generateObject({
      model: options.model,
      schema: PreferenceExtractionSchema,
      prompt: `Extract founder preferences from this message. Return only supported keys. Message: ${text}`,
      abortSignal: AbortSignal.timeout(options.timeoutMs ?? 8_000),
    });
    return generated.object.preferences;
  } catch {
    return [];
  }
}
