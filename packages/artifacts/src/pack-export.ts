import type { Artifact, Experiment, Gate, Source } from '@foundry/domain';

import type { ArtifactRenderContext } from './document-model.js';

export type PackExportInput = ArtifactRenderContext & {
  projectId: string;
  sources: Source[];
  experiments: Experiment[];
  artifacts: Artifact[];
  gates: Gate[];
};

export type PackExportDocument = {
  format: 'foundry-pack-export';
  formatVersion: 1;
  generatedAt: string;
  project: {
    id: string;
    name: string;
    phase: string;
  };
  packRevision: {
    id: string;
    revisionNumber: number;
  };
  moneyRules: ArtifactRenderContext['moneyRules'];
  marketModels: ArtifactRenderContext['marketModels'];
  unitEconomics: ArtifactRenderContext['unitEconomics'];
  interviews: ArtifactRenderContext['interviews'];
  quotes: ArtifactRenderContext['quotes'];
  beachheads: ArtifactRenderContext['beachheads'];
  dmus: ArtifactRenderContext['dmus'];
  wtpEvents: ArtifactRenderContext['wtpEvents'];
  clarifications: ArtifactRenderContext['clarifications'];
  experiments: Experiment[];
  gates: Gate[];
  artifacts: Artifact[];
  manifest: {
    evidence: Array<{
      sourceId: string;
      kind: Source['kind'];
      status: Source['status'];
      originalFilename: string | null;
      sourceUrl: string | null;
      available: boolean;
    }>;
    citations: Array<{ quoteId: string; interviewId: string | null }>;
    provenance: string;
  };
};

export function buildPackExport(input: PackExportInput): {
  document: PackExportDocument;
  body: Buffer;
} {
  const document: PackExportDocument = {
    format: 'foundry-pack-export',
    formatVersion: 1,
    generatedAt: input.generatedAt.toISOString(),
    project: {
      id: input.projectId,
      name: input.projectName,
      phase: input.phase,
    },
    packRevision: {
      id: input.packRevisionId,
      revisionNumber: input.packRevisionNumber,
    },
    moneyRules: input.moneyRules,
    marketModels: input.marketModels,
    unitEconomics: input.unitEconomics,
    interviews: input.interviews,
    quotes: input.quotes,
    beachheads: input.beachheads,
    dmus: input.dmus,
    wtpEvents: input.wtpEvents,
    clarifications: input.clarifications,
    experiments: input.experiments,
    gates: input.gates,
    artifacts: input.artifacts,
    manifest: {
      evidence: input.sources.map((source) => ({
        sourceId: source.id,
        kind: source.kind,
        status: source.status,
        originalFilename: source.originalFilename,
        sourceUrl: source.sourceUrl,
        available: source.status !== 'failed',
      })),
      citations: input.quotes.map((quote) => ({
        quoteId: quote.id,
        interviewId: quote.interviewId,
      })),
      provenance:
        'Relational pack snapshot. Numeric fields are workflow_derived from MoneyRules and calculators; deleted or failed sources are marked unavailable.',
    },
  };
  return {
    document,
    body: Buffer.from(`${JSON.stringify(document, null, 2)}\n`, 'utf8'),
  };
}

export const PACK_EXPORT_CONTENT_TYPE = 'application/json; charset=utf-8';
