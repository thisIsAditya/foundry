import { reconcileMoneyIdentities } from '@foundry/policy';

import { buildDocumentModel, checkNumericClaims, collectClaims } from './build-document.js';
import type {
  ArtifactRenderContext,
  ArtifactRenderResult,
  RenderedFile,
} from './document-model.js';
import { renderHtml } from './render-html.js';
import { renderMarkdown, renderSlideMarkdown } from './render-markdown.js';
import { pdfLinesFromMarkdown, renderPdf } from './render-pdf.js';
import { buildMarketEconomicsWorkbook, MARKET_ECONOMICS_CONTENT_TYPE } from './workbook.js';

const MARKDOWN_TYPE = 'text/markdown; charset=utf-8';
const HTML_TYPE = 'text/html; charset=utf-8';
const PDF_TYPE = 'application/pdf';

function file(extension: string, contentType: string, body: Buffer | string): RenderedFile {
  return {
    extension,
    contentType,
    body: typeof body === 'string' ? Buffer.from(body, 'utf8') : body,
  };
}

function documentFiles(
  ctx: ArtifactRenderContext,
  markdown: string,
  htmlVariant: 'document' | 'slides' | 'canvas',
): { files: RenderedFile[]; claims: ReturnType<typeof collectClaims>; staleWarnings: string[] } {
  const model = buildDocumentModel(ctx);
  const numericWarnings = checkNumericClaims(ctx, model);
  model.staleWarnings = [...model.staleWarnings, ...numericWarnings];
  const html = renderHtml(model, htmlVariant);
  const pdf = renderPdf(model.title, pdfLinesFromMarkdown(markdown));
  return {
    files: [
      file('md', MARKDOWN_TYPE, markdown),
      file('html', HTML_TYPE, html),
      file('pdf', PDF_TYPE, pdf),
    ],
    claims: collectClaims(model),
    staleWarnings: model.staleWarnings,
  };
}

function renderWorkbook(ctx: ArtifactRenderContext): ArtifactRenderResult {
  const moneyRules = ctx.moneyRules;
  const market = ctx.marketModels[0];
  const unitModel = ctx.unitEconomics[0];
  if (
    moneyRules === null ||
    market === undefined ||
    market.computedResult === null ||
    unitModel === undefined ||
    unitModel.margin === null ||
    unitModel.sensitivity === null
  ) {
    throw new Error('MoneyRules and a computed market model are required.');
  }
  const warnings = reconcileMoneyIdentities({
    moneyRules,
    market: market.computedResult,
    unitEconomics: unitModel.margin,
  });
  const bytes = buildMarketEconomicsWorkbook({
    moneyRules,
    marketInputs: market.inputs,
    market: market.computedResult,
    unitEconomics: unitModel.margin,
    sensitivity: unitModel.sensitivity,
    warnings,
    generatedAt: ctx.generatedAt,
  });
  return {
    primaryExtension: 'xlsx',
    files: [file('xlsx', MARKET_ECONOMICS_CONTENT_TYPE, bytes)],
    citations: {
      packRevisionId: ctx.packRevisionId,
      templateVersion: 1,
      staleWarnings: warnings.map((warning) => warning.detail),
      claims: [
        { label: 'price', value: moneyRules.price, source: 'money_rules' },
        { label: 'som', value: market.computedResult.som, source: 'market_model' },
      ],
    },
  };
}

export function renderArtifact(ctx: ArtifactRenderContext): ArtifactRenderResult {
  if (ctx.artifactType === 'market_economics_workbook') {
    return renderWorkbook(ctx);
  }
  const model = buildDocumentModel(ctx);
  const markdown =
    ctx.artifactType === 'slide_outline' ? renderSlideMarkdown(model) : renderMarkdown(model);
  const htmlVariant =
    ctx.artifactType === 'slide_outline'
      ? 'slides'
      : ctx.artifactType === 'lean_canvas' || ctx.artifactType === 'business_model_canvas'
        ? 'canvas'
        : 'document';
  const rendered = documentFiles(ctx, markdown, htmlVariant);
  const primaryExtension =
    ctx.artifactType === 'one_page_brief'
      ? 'pdf'
      : ctx.artifactType === 'lean_canvas' || ctx.artifactType === 'business_model_canvas'
        ? 'html'
        : 'md';
  return {
    primaryExtension,
    files: rendered.files,
    citations: {
      packRevisionId: ctx.packRevisionId,
      templateVersion: 1,
      staleWarnings: rendered.staleWarnings,
      claims: rendered.claims,
    },
  };
}

export function artifactObjectKey(
  projectId: string,
  artifactId: string,
  versionNumber: number,
  extension: string,
): string {
  return `artifacts/${projectId}/${artifactId}/${versionNumber}.${extension}`;
}

export function siblingObjectKey(primaryKey: string, extension: string): string {
  return primaryKey.replace(/\.[^.]+$/u, `.${extension}`);
}

export function extensionForFormat(format: 'markdown' | 'html' | 'pdf' | 'xlsx' | 'json'): string {
  switch (format) {
    case 'markdown':
      return 'md';
    case 'html':
      return 'html';
    case 'pdf':
      return 'pdf';
    case 'xlsx':
      return 'xlsx';
    case 'json':
      return 'json';
  }
}

export function primaryExtensionFor(artifactType: ArtifactRenderContext['artifactType']): string {
  switch (artifactType) {
    case 'market_economics_workbook':
      return 'xlsx';
    case 'one_page_brief':
      return 'pdf';
    case 'lean_canvas':
    case 'business_model_canvas':
      return 'html';
    case 'company_pack':
    case 'evidence_report':
    case 'slide_outline':
      return 'md';
  }
}
