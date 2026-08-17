import type {
  ArtifactRenderContext,
  DocumentClaim,
  DocumentModel,
  DocumentSection,
} from './document-model.js';
import { missingLabel } from './document-model.js';

function moneyClaims(ctx: ArtifactRenderContext): DocumentClaim[] {
  const money = ctx.moneyRules;
  if (money === null) {
    return [{ label: 'price', value: missingLabel('MoneyRules'), source: 'unset' }];
  }
  return [
    { label: 'currency', value: money.currency, source: 'money_rules' },
    { label: 'unit_of_sale', value: money.unitOfSale, source: 'money_rules' },
    { label: 'price', value: money.price, source: 'money_rules' },
  ];
}

function marketClaims(ctx: ArtifactRenderContext): DocumentClaim[] {
  const market = ctx.marketModels[0]?.computedResult;
  if (market === undefined || market === null) {
    return [{ label: 'som', value: missingLabel('market model'), source: 'unset' }];
  }
  return [
    { label: 'tam', value: market.tam, source: 'market_model' },
    { label: 'sam', value: market.sam, source: 'market_model' },
    { label: 'som', value: market.som, source: 'market_model' },
  ];
}

function unitClaims(ctx: ArtifactRenderContext): DocumentClaim[] {
  const unit = ctx.unitEconomics[0];
  if (unit === undefined || unit.ltv === null) {
    return [{ label: 'ltv', value: missingLabel('unit economics'), source: 'unset' }];
  }
  return [
    { label: 'ltv', value: unit.ltv, source: 'unit_economics_model' },
    { label: 'cac', value: unit.cac ?? missingLabel('cac'), source: 'unit_economics_model' },
    {
      label: 'payback',
      value: unit.payback ?? missingLabel('payback'),
      source: 'unit_economics_model',
    },
  ];
}

function beachheadBody(ctx: ArtifactRenderContext): string {
  if (ctx.beachheads.length === 0) {
    return 'No beachhead is recorded on this pack revision.';
  }
  return ctx.beachheads.map((item) => item.segmentDefinition).join('\n\n');
}

function evidenceBody(ctx: ArtifactRenderContext): string {
  const lines = [
    `Interviews recorded: ${String(ctx.interviews.length)}.`,
    `Quotes recorded: ${String(ctx.quotes.length)}.`,
  ];
  for (const quote of ctx.quotes.slice(0, 8)) {
    lines.push(`- "${quote.textContent}"`);
  }
  if (ctx.quotes.length === 0) {
    lines.push('No interview quotes are stored yet.');
  }
  return lines.join('\n');
}

function wtpBody(ctx: ArtifactRenderContext): string {
  if (ctx.wtpEvents.length === 0) {
    return 'No willingness-to-pay events are recorded.';
  }
  return ctx.wtpEvents
    .map((event) => {
      const amount = event.amount === null ? 'unspecified amount' : event.amount;
      return `- ${event.participantClass} / ${event.instrument}: ${amount}`;
    })
    .join('\n');
}

function clarificationBody(ctx: ArtifactRenderContext): string {
  if (ctx.clarifications.length === 0) {
    return 'No founder clarifications are stored on this revision.';
  }
  return ctx.clarifications.map((item) => `- ${item.questionId}: ${item.answer}`).join('\n');
}

function dmuBody(ctx: ArtifactRenderContext): string {
  if (ctx.dmus.length === 0) {
    return 'No decision-making unit is recorded.';
  }
  return ctx.dmus
    .map((dmu) => {
      const roles = [
        dmu.user === null ? null : `user ${dmu.user}`,
        dmu.champion === null ? null : `champion ${dmu.champion}`,
        dmu.buyer === null ? null : `buyer ${dmu.buyer}`,
        dmu.approver === null ? null : `approver ${dmu.approver}`,
      ].filter((role): role is string => role !== null);
      return roles.length === 0 ? '- DMU recorded without named roles.' : `- ${roles.join(', ')}`;
    })
    .join('\n');
}

function provenanceFooter(ctx: ArtifactRenderContext): DocumentSection {
  return {
    id: 'provenance',
    title: 'Provenance',
    body: `Pack revision ${String(ctx.packRevisionNumber)} (${ctx.packRevisionId}). Numbers come from MoneyRules and calculators; missing fields are labeled unset. Generated ${ctx.generatedAt.toISOString()}.`,
    claims: [],
  };
}

export function buildCompanyPackDocument(ctx: ArtifactRenderContext): DocumentModel {
  return {
    title: `${ctx.projectName} company pack`,
    artifactType: 'company_pack',
    packRevisionId: ctx.packRevisionId,
    packRevisionNumber: ctx.packRevisionNumber,
    generatedAt: ctx.generatedAt,
    staleWarnings: [],
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        body: `${ctx.projectName} is in the ${ctx.phase} phase.`,
        claims: [],
      },
      {
        id: 'clarifications',
        title: 'Founder clarifications',
        body: clarificationBody(ctx),
        claims: [],
      },
      {
        id: 'beachhead',
        title: 'Beachhead',
        body: beachheadBody(ctx),
        claims: [],
      },
      {
        id: 'evidence',
        title: 'Evidence',
        body: evidenceBody(ctx),
        claims: [],
      },
      {
        id: 'money',
        title: 'MoneyRules',
        body: 'Canonical price and unit of sale. Missing values are not invented.',
        claims: moneyClaims(ctx),
      },
      {
        id: 'market',
        title: 'Market size',
        body: 'Bottom-up TAM / SAM / SOM from the stored market model.',
        claims: marketClaims(ctx),
      },
      {
        id: 'unit_economics',
        title: 'Unit economics',
        body: 'LTV, CAC, and payback from the stored unit-economics model.',
        claims: unitClaims(ctx),
      },
      {
        id: 'wtp',
        title: 'Willingness to pay',
        body: wtpBody(ctx),
        claims: [],
      },
      provenanceFooter(ctx),
    ],
  };
}

export function buildLeanCanvasDocument(ctx: ArtifactRenderContext): DocumentModel {
  return {
    title: `${ctx.projectName} Lean Canvas`,
    artifactType: 'lean_canvas',
    packRevisionId: ctx.packRevisionId,
    packRevisionNumber: ctx.packRevisionNumber,
    generatedAt: ctx.generatedAt,
    staleWarnings: [],
    sections: [
      {
        id: 'problem',
        title: 'Problem',
        body: clarificationBody(ctx),
        claims: [],
      },
      {
        id: 'customer',
        title: 'Customer segments',
        body: beachheadBody(ctx),
        claims: [],
      },
      {
        id: 'revenue',
        title: 'Revenue',
        body: 'Price is taken from canonical MoneyRules.',
        claims: moneyClaims(ctx),
      },
      provenanceFooter(ctx),
    ],
  };
}

export function buildBusinessModelCanvasDocument(ctx: ArtifactRenderContext): DocumentModel {
  return {
    title: `${ctx.projectName} Business Model Canvas`,
    artifactType: 'business_model_canvas',
    packRevisionId: ctx.packRevisionId,
    packRevisionNumber: ctx.packRevisionNumber,
    generatedAt: ctx.generatedAt,
    staleWarnings: [],
    sections: [
      {
        id: 'customers',
        title: 'Customer segments',
        body: beachheadBody(ctx),
        claims: [],
      },
      {
        id: 'dmu',
        title: 'Decision-making unit',
        body: dmuBody(ctx),
        claims: [],
      },
      {
        id: 'revenue',
        title: 'Revenue streams',
        body: 'Canonical MoneyRules only.',
        claims: moneyClaims(ctx),
      },
      provenanceFooter(ctx),
    ],
  };
}

export function buildEvidenceReportDocument(ctx: ArtifactRenderContext): DocumentModel {
  return {
    title: `${ctx.projectName} evidence report`,
    artifactType: 'evidence_report',
    packRevisionId: ctx.packRevisionId,
    packRevisionNumber: ctx.packRevisionNumber,
    generatedAt: ctx.generatedAt,
    staleWarnings: [],
    sections: [
      {
        id: 'interviews',
        title: 'Interviews',
        body:
          ctx.interviews.map((item) => `- ${item.participantType} (${item.id})`).join('\n') ||
          'No interviews recorded.',
        claims: [],
      },
      {
        id: 'quotes',
        title: 'Quotes',
        body: evidenceBody(ctx),
        claims: [],
      },
      provenanceFooter(ctx),
    ],
  };
}

export function buildOnePageBriefDocument(ctx: ArtifactRenderContext): DocumentModel {
  return {
    title: `${ctx.projectName} one-page brief`,
    artifactType: 'one_page_brief',
    packRevisionId: ctx.packRevisionId,
    packRevisionNumber: ctx.packRevisionNumber,
    generatedAt: ctx.generatedAt,
    staleWarnings: [],
    sections: [
      {
        id: 'brief',
        title: ctx.projectName,
        body: `${ctx.projectName} · ${ctx.phase}\n\n${clarificationBody(ctx)}\n\n${beachheadBody(ctx)}`,
        claims: [...moneyClaims(ctx), ...marketClaims(ctx)],
      },
      provenanceFooter(ctx),
    ],
  };
}

export function buildSlideOutlineDocument(ctx: ArtifactRenderContext): DocumentModel {
  return {
    title: `${ctx.projectName} slide outline`,
    artifactType: 'slide_outline',
    packRevisionId: ctx.packRevisionId,
    packRevisionNumber: ctx.packRevisionNumber,
    generatedAt: ctx.generatedAt,
    staleWarnings: [],
    sections: [
      {
        id: 'slide-title',
        title: ctx.projectName,
        body: `Purpose: introduce the company.\nKey message: ${ctx.projectName} is in the ${ctx.phase} phase.`,
        claims: [],
      },
      {
        id: 'slide-problem',
        title: 'Problem',
        body: `Purpose: state the painful job.\n${clarificationBody(ctx)}`,
        claims: [],
      },
      {
        id: 'slide-beachhead',
        title: 'Beachhead',
        body: `Purpose: name the first market.\n${beachheadBody(ctx)}`,
        claims: [],
      },
      {
        id: 'slide-money',
        title: 'Economics',
        body: 'Purpose: show canonical price. No unsupported metric.',
        claims: [...moneyClaims(ctx), ...unitClaims(ctx)],
      },
      {
        id: 'slide-wtp',
        title: 'Traction',
        body: `Purpose: show willingness-to-pay evidence.\n${wtpBody(ctx)}`,
        claims: [],
      },
      provenanceFooter(ctx),
    ],
  };
}

export function buildDocumentModel(ctx: ArtifactRenderContext): DocumentModel {
  switch (ctx.artifactType) {
    case 'company_pack':
      return buildCompanyPackDocument(ctx);
    case 'lean_canvas':
      return buildLeanCanvasDocument(ctx);
    case 'business_model_canvas':
      return buildBusinessModelCanvasDocument(ctx);
    case 'evidence_report':
      return buildEvidenceReportDocument(ctx);
    case 'one_page_brief':
      return buildOnePageBriefDocument(ctx);
    case 'slide_outline':
      return buildSlideOutlineDocument(ctx);
    case 'market_economics_workbook':
      throw new Error('workbook artifacts do not use the document model');
  }
}

export function collectClaims(model: DocumentModel): DocumentClaim[] {
  return model.sections.flatMap((section) => section.claims);
}

export function allowedNumericValues(ctx: ArtifactRenderContext): Set<string> {
  const values = new Set<string>();
  if (ctx.moneyRules !== null) {
    values.add(ctx.moneyRules.price);
    values.add(ctx.moneyRules.costStructure.cogs);
    values.add(ctx.moneyRules.costStructure.variableCostPerUnit);
    values.add(ctx.moneyRules.costStructure.cac);
  }
  const market = ctx.marketModels[0]?.computedResult;
  if (market !== undefined && market !== null) {
    values.add(market.tam);
    values.add(market.sam);
    values.add(market.som);
  }
  const unit = ctx.unitEconomics[0];
  if (unit !== undefined) {
    if (unit.ltv !== null) {
      values.add(unit.ltv);
    }
    if (unit.cac !== null) {
      values.add(unit.cac);
    }
    if (unit.payback !== null) {
      values.add(unit.payback);
    }
  }
  return values;
}

export function checkNumericClaims(ctx: ArtifactRenderContext, model: DocumentModel): string[] {
  const allowed = allowedNumericValues(ctx);
  const warnings: string[] = [];
  for (const claim of collectClaims(model)) {
    if (claim.source === 'unset') {
      continue;
    }
    if (!allowed.has(claim.value)) {
      warnings.push(`claim ${claim.label} is not in the stored calculator outputs`);
    }
  }
  return warnings;
}
