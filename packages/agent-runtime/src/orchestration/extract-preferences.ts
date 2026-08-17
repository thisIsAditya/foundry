export type ExtractedPreference = {
  key: string;
  value: string;
};

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
