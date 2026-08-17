import type {
  Beachhead,
  Dmu,
  Interview,
  JourneyPhase,
  MarketModel,
  MoneyRules,
  PackRevision,
  Quote,
  UnitEconomicsModel,
  WtpEvent,
} from '@foundry/domain';

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
  moneyRules: MoneyRules | null;
  marketModels: MarketModel[];
  unitEconomics: UnitEconomicsModel[];
  wtpEvents: WtpEvent[];
  clarifications: ClarificationAnswer[];
};
