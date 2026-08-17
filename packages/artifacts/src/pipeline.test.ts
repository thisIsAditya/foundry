import {
  MoneyRulesIdSchema,
  PackRevisionIdSchema,
  ProjectIdSchema,
  type MoneyRules,
} from '@foundry/domain';
import { describe, expect, it } from 'vitest';

import { buildDocumentModel } from './build-document.js';
import { dependentsOf } from './dependency-graph.js';
import type { ArtifactRenderContext } from './document-model.js';
import { buildPackExport } from './pack-export.js';
import { renderArtifact } from './pipeline.js';
import { renderPdf } from './render-pdf.js';

const moneyRules: MoneyRules = {
  id: MoneyRulesIdSchema.parse('11111111-1111-4111-8111-111111111111'),
  projectId: ProjectIdSchema.parse('22222222-2222-4222-8222-222222222222'),
  packRevisionId: PackRevisionIdSchema.parse('33333333-3333-4333-8333-333333333333'),
  currency: 'INR',
  unitOfSale: 'seat-month',
  price: '99',
  billingFrequency: 'monthly',
  costStructure: {
    cogs: '20',
    variableCostPerUnit: '5',
    cac: '150',
    lifetimePeriods: 24,
  },
  isCurrent: true,
  createdAt: new Date('2026-04-01T00:00:00.000Z'),
};

function context(artifactType: ArtifactRenderContext['artifactType']): ArtifactRenderContext {
  return {
    artifactType,
    projectName: 'Cafe OS',
    phase: 'diagnose',
    packRevisionId: moneyRules.packRevisionId,
    packRevisionNumber: 1,
    interviews: [],
    quotes: [],
    beachheads: [],
    dmus: [],
    moneyRules,
    marketModels: [],
    unitEconomics: [],
    wtpEvents: [],
    clarifications: [{ questionId: 'problem', answer: 'Closing the books takes two hours.' }],
    generatedAt: new Date('2026-08-17T00:00:00.000Z'),
  };
}

describe('artifact pipeline', () => {
  it('marks pack and workbook stale when MoneyRules change', () => {
    expect(dependentsOf('money_rules')).toEqual(
      expect.arrayContaining(['market_economics_workbook', 'company_pack', 'one_page_brief']),
    );
  });

  it('renders markdown, html, and pdf without inventing a price', () => {
    const rendered = renderArtifact(context('company_pack'));
    const markdown = rendered.files.find((item) => item.extension === 'md');
    const html = rendered.files.find((item) => item.extension === 'html');
    const pdf = rendered.files.find((item) => item.extension === 'pdf');
    expect(markdown?.body.toString('utf8')).toContain('99');
    expect(markdown?.body.toString('utf8')).toContain('Closing the books takes two hours.');
    expect(html?.body.toString('utf8')).toContain('Cafe OS company pack');
    expect(pdf?.body.subarray(0, 5).toString('utf8')).toBe('%PDF-');
    expect(rendered.primaryExtension).toBe('md');
  });

  it('omits unset market totals instead of fabricating them', () => {
    const model = buildDocumentModel(context('one_page_brief'));
    const som = model.sections
      .flatMap((section) => section.claims)
      .find((claim) => claim.label === 'som');
    expect(som?.source).toBe('unset');
    expect(som?.value).toContain('not set');
  });

  it('writes a pack export with an evidence manifest', () => {
    const exported = buildPackExport({
      ...context('company_pack'),
      projectId: moneyRules.projectId,
      sources: [],
      experiments: [],
      artifacts: [],
      gates: [],
    });
    expect(exported.document.format).toBe('foundry-pack-export');
    expect(exported.document.manifest.provenance).toContain('MoneyRules');
    expect(exported.body.toString('utf8')).toContain('"formatVersion": 1');
  });

  it('builds a parseable PDF for a slide outline', () => {
    const pdf = renderPdf('Deck', ['One message per slide']);
    expect(pdf.toString('utf8')).toContain('startxref');
    expect(pdf.toString('utf8')).toContain('%%EOF');
  });
});
