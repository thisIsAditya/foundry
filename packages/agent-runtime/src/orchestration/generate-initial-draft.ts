import { BusinessModelSectionKeys, type BusinessModelSectionKey } from '@foundry/domain';

import type { InitialDraft, InitialDraftSection } from '../contracts/output-schema.js';

function sectionFromFounderInput(
  key: BusinessModelSectionKey,
  founderText: string,
  geography: string | null,
): InitialDraftSection {
  const trimmed = founderText.trim();
  if (key === 'context' && (geography !== null || trimmed.length > 0)) {
    return {
      key,
      provenance: 'founder_input',
      summary:
        geography === null
          ? `Working name and idea: ${trimmed.slice(0, 240)}`
          : `Geography ${geography}. Idea: ${trimmed.slice(0, 240)}`,
    };
  }
  if (key === 'problem' && trimmed.length >= 24) {
    return {
      key,
      provenance: 'founder_input',
      summary: `Founder-stated starting point: ${trimmed.slice(0, 280)}`,
    };
  }
  if (key === 'legal_compliance') {
    return {
      key,
      provenance: 'assumption',
      summary: 'Assume India jurisdiction and professional CA/CS review before any filing.',
    };
  }
  return {
    key,
    provenance: 'open_question',
    summary: 'Not yet known — this section is an open question, not a fact.',
    reason: 'No founder input or research exists for this section yet.',
  };
}

export function buildInitialDraft(input: {
  founderText: string;
  geography: string | null;
}): InitialDraft {
  const sections = BusinessModelSectionKeys.map((key) =>
    sectionFromFounderInput(key, input.founderText, input.geography),
  );
  const assumptionCount = sections.filter((item) => item.provenance === 'assumption').length;
  const questionCount = sections.filter((item) => item.provenance === 'open_question').length;
  return {
    sections,
    founderMessage: `I drafted a complete first pass of the 17-section business model. ${assumptionCount} sections are explicit assumptions and ${questionCount} are open questions. Nothing here is a validated fact yet. Review the proposed baseline research before it starts.`,
  };
}
