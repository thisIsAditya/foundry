import type {
  ArtifactType,
  Beachhead,
  Dmu,
  Interview,
  JourneyPhase,
  MarketModel,
  MoneyRules,
  Quote,
  UnitEconomicsModel,
  WtpEvent,
} from '@foundry/domain';

export type DocumentClaim = {
  label: string;
  value: string;
  source: string;
};

export type DocumentSection = {
  id: string;
  title: string;
  body: string;
  claims: DocumentClaim[];
};

export type DocumentModel = {
  title: string;
  artifactType: ArtifactType;
  packRevisionId: string;
  packRevisionNumber: number;
  generatedAt: Date;
  sections: DocumentSection[];
  staleWarnings: string[];
};

export type ArtifactRenderContext = {
  artifactType: ArtifactType;
  projectName: string;
  phase: JourneyPhase;
  packRevisionId: string;
  packRevisionNumber: number;
  interviews: Interview[];
  quotes: Quote[];
  beachheads: Beachhead[];
  dmus: Dmu[];
  moneyRules: MoneyRules | null;
  marketModels: MarketModel[];
  unitEconomics: UnitEconomicsModel[];
  wtpEvents: WtpEvent[];
  clarifications: { questionId: string; answer: string }[];
  generatedAt: Date;
};

export type RenderedFile = {
  extension: string;
  contentType: string;
  body: Buffer;
};

export type ArtifactRenderResult = {
  primaryExtension: string;
  files: RenderedFile[];
  citations: {
    packRevisionId: string;
    templateVersion: number;
    staleWarnings: string[];
    claims: DocumentClaim[];
  };
};

export function missingLabel(field: string): string {
  return `${field} is not set`;
}
