const PATTERNS = [
  /ignore (all )?previous instructions/i,
  /you are now /i,
  /system prompt/i,
  /<<\s*sys\s*>>/i,
  /dan mode/i,
];

export function detectPromptInjection(text: string): { suspected: boolean; matches: string[] } {
  const matches = PATTERNS.flatMap((pattern) => {
    const found = text.match(pattern);
    return found === null ? [] : [found[0]];
  });
  return { suspected: matches.length > 0, matches };
}

export function wrapUntrustedDocument(text: string, sourceId: string): string {
  return `<<<UNTRUSTED_DOCUMENT sourceId=${sourceId}>>>\n${text}\n<<<END_UNTRUSTED_DOCUMENT>>>`;
}
