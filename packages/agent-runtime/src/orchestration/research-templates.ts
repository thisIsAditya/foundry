import type { AiJobKind } from '@foundry/domain';

export type BaselineResearchTemplate = {
  objective: string;
  whyNow: string;
  roleLabel: string;
  jobKind: AiJobKind;
};

export function baselineResearchTemplate(geography: string | null): BaselineResearchTemplate {
  const place = geography?.trim() || 'India';
  return {
    objective: `Baseline market and competitor research for ${place}`,
    whyNow:
      'The first draft is assumption-heavy; cited market and competitor evidence is the highest-leverage next step.',
    roleLabel: 'Market researcher',
    jobKind: 'research',
  };
}
