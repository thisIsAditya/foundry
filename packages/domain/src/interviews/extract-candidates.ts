import {
  InterviewParticipantTypeSchema,
  type InterviewParticipantType,
} from '../status/evidence-status.js';

export type ExtractedInterviewCandidate = {
  label: string;
  participantType: InterviewParticipantType;
  consentGiven: boolean;
  consentUnknown: boolean;
  notes: string;
  quotes: string[];
  excerpt: string;
  warnings: string[];
};

const CONSENT_TRUE = /\bconsent(?:ed|s)?\s*[:=]\s*(yes|true|given)\b/i;
const PARTICIPANT_LINE =
  /\bparticipant(?:\s*type)?\s*[:=]\s*(non[_\s-]?friend|friend|known[_\s-]?contact)\b/i;

function normalizeParticipant(value: string | undefined): InterviewParticipantType {
  if (value === undefined) {
    return 'known_contact';
  }
  const parsed = InterviewParticipantTypeSchema.safeParse(
    value.trim().toLowerCase().replaceAll(' ', '_').replaceAll('-', '_'),
  );
  return parsed.success ? parsed.data : 'known_contact';
}

function splitQuotes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((line) => line.replace(/^>\s*/, '').trim())
      .filter((line) => line.length > 0);
  }
  return [];
}

function consentFromText(text: string): { given: boolean; unknown: boolean; warning?: string } {
  if (CONSENT_TRUE.test(text)) {
    return {
      given: false,
      unknown: true,
      warning: 'Consent was mentioned but is unconfirmed until you attest it.',
    };
  }
  return { given: false, unknown: true };
}

function fromJsonRecord(
  value: Record<string, unknown>,
  index: number,
): ExtractedInterviewCandidate | null {
  const quotes = splitQuotes(value.quotes ?? value.quote);
  const notes =
    typeof value.notes === 'string'
      ? value.notes.trim()
      : typeof value.summary === 'string'
        ? value.summary.trim()
        : '';
  if (quotes.length === 0 && notes.length === 0) {
    return null;
  }
  const label =
    typeof value.label === 'string' && value.label.trim().length > 0
      ? value.label.trim()
      : `Interview ${String(index + 1)}`;
  const rawText = `${label}\n${notes}\n${quotes.join('\n')}`;
  const consent = consentFromText(rawText);
  const participantType = normalizeParticipant(
    typeof value.participantType === 'string' ? value.participantType : undefined,
  );
  const warnings = [
    ...(consent.warning === undefined ? [] : [consent.warning]),
    ...(typeof value.participantType === 'string'
      ? []
      : ['Participant type was not stated; stored as known contact, not independent proof.']),
    'Consent stays unconfirmed until you explicitly record it.',
  ];
  return {
    label,
    participantType,
    consentGiven: false,
    consentUnknown: true,
    notes,
    quotes: quotes.length === 0 ? [notes] : quotes,
    excerpt: rawText.slice(0, 800),
    warnings,
  };
}

function parseJsonBundle(text: string): ExtractedInterviewCandidate[] | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed.flatMap((item, index) => {
      if (item === null || typeof item !== 'object') {
        return [];
      }
      const candidate = fromJsonRecord(item as Record<string, unknown>, index);
      return candidate === null ? [] : [candidate];
    });
  } catch {
    return null;
  }
}

function splitPlainBlocks(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }
  const parts = trimmed.split(/(?:^|\n)(?:---+|\*\*\*+|Interview\s+\d+\s*[.:]?)\s*/i);
  const blocks = parts.map((part) => part.trim()).filter((part) => part.length > 0);
  return blocks.length === 0 ? [trimmed] : blocks;
}

function fromPlainBlock(block: string, index: number): ExtractedInterviewCandidate {
  const lines = block.split('\n').map((line) => line.trim());
  const quotes = lines
    .filter((line) => line.startsWith('>') || line.startsWith('"') || line.startsWith('“'))
    .map((line) =>
      line
        .replace(/^>\s*/, '')
        .replace(/^["“]|["”]$/g, '')
        .trim(),
    )
    .filter((line) => line.length > 0);
  const notes = lines
    .filter((line) => !line.startsWith('>') && !line.startsWith('"') && !line.startsWith('“'))
    .join('\n')
    .trim();
  const participantMatch = block.match(PARTICIPANT_LINE);
  const participantType = normalizeParticipant(participantMatch?.[1]);
  const consent = consentFromText(block);
  const label = `Interview ${String(index + 1)}`;
  const usableQuotes = quotes.length === 0 ? (notes.length === 0 ? [] : [notes]) : quotes;
  return {
    label,
    participantType,
    consentGiven: false,
    consentUnknown: true,
    notes,
    quotes: usableQuotes,
    excerpt: block.slice(0, 800),
    warnings: [
      ...(consent.warning === undefined ? [] : [consent.warning]),
      ...(participantMatch === null
        ? ['Participant type was not stated; stored as known contact, not independent proof.']
        : []),
      'Consent stays unconfirmed until you explicitly record it.',
    ],
  };
}

export function extractInterviewCandidates(text: string): ExtractedInterviewCandidate[] {
  const json = parseJsonBundle(text);
  if (json !== null) {
    return json.filter((item) => item.quotes.length > 0);
  }
  return splitPlainBlocks(text)
    .map(fromPlainBlock)
    .filter((item) => item.quotes.length > 0);
}

export function classifyInterviewSource(candidates: readonly ExtractedInterviewCandidate[]): {
  classification: 'interview_bundle' | 'single_interview' | 'other';
} {
  if (candidates.length >= 2) {
    return { classification: 'interview_bundle' };
  }
  if (candidates.length === 1) {
    return { classification: 'single_interview' };
  }
  return { classification: 'other' };
}
