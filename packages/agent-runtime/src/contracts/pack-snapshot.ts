import type {
  Assumption,
  Beachhead,
  Decision,
  Dmu,
  Interview,
  JourneyPhase,
  MarketModel,
  MoneyRules,
  PackRevision,
  PackSection,
  Persona,
  Problem,
  Quote,
  UnitEconomicsModel,
  WtpEvent,
} from '@foundry/domain';

export type ClarificationAnswer = {
  questionId: string;
  answer: string;
  answeredAt: string;
};

/**
 * Everything the context assembler knows about the founder's plan as of the current
 * accepted pack revision, plus a pending draft if one exists (08 §11, plan §Slice 2
 * "pack as system of record"). This is intentionally a superset of what any single call
 * site formats into a prompt — the assembler decides what a given run actually needs.
 */
export type PackSnapshot = {
  pack: PackRevision;
  /** Pending draft revision layered on top of `pack`, if one hasn't been accepted/rejected yet. */
  pendingDraftRevision: PackRevision | null;
  phase: JourneyPhase;
  /** Derived journey phase from `deriveJourneyPhase`, computed by callers with access to the
   * business-model-section aggregation (today only `apps/web`'s desk summary). `null` when the
   * caller can't compute it (e.g. the sprint worker) — fall back to `phase` in that case. */
  derivedPhase: JourneyPhase | null;
  interviews: Interview[];
  quotes: Quote[];
  beachheads: Beachhead[];
  dmus: Dmu[];
  personas: Persona[];
  problems: Problem[];
  moneyRules: MoneyRules | null;
  marketModels: MarketModel[];
  unitEconomics: UnitEconomicsModel[];
  wtpEvents: WtpEvent[];
  assumptions: Assumption[];
  decisions: Decision[];
  packSections: PackSection[];
  clarifications: ClarificationAnswer[];
};
