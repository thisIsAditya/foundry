import type { Beachhead, Dmu, Interview, JourneyPhase, PackRevision, Quote } from '@foundry/domain';

export type ClarificationAnswer = {
  questionId: string;
  answer: string;
  answeredAt: string;
};

export type PackSnapshot = {
  pack: PackRevision;
  phase: JourneyPhase;
  interviews: Interview[];
  quotes: Quote[];
  beachheads: Beachhead[];
  dmus: Dmu[];
  clarifications: ClarificationAnswer[];
};
