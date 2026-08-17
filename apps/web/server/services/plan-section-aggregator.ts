import type { BusinessModelSectionCard } from '@foundry/api-contracts';
import {
  getCurrentMoneyRules,
  listAlternativesByProjectId,
  listArtifactsByProjectId,
  listAssumptionsByProjectId,
  listBeachheadsByPackRevisionId,
  listBusinessModelsByPackRevisionId,
  listCompetitorsByProjectId,
  listDecisionsByProjectId,
  listDmusByPackRevisionId,
  listEvidenceItemsByProjectId,
  listExperimentsByProjectId,
  listGatesByProjectId,
  listInterviewsByProjectId,
  listMarketModelsByPackRevisionId,
  listMetricDefinitionsByProjectId,
  listOffersByBusinessModelId,
  listPackRevisionsByProjectId,
  listPackSections,
  listPersonasByPackRevisionId,
  listProblemsByPackRevisionId,
  listQuotesByInterviewIds,
  listUnitEconomicsByPackRevisionId,
  listWedgesByPackRevisionId,
  listWtpEventsByProjectId,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  BusinessModelSectionKeys,
  type BusinessModelSectionKey,
  type BusinessModelSectionStatus,
  type PackRevision,
  type Project,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';

const SECTION_TITLES: Record<BusinessModelSectionKey, string> = {
  context: 'Context',
  problem: 'Problem',
  beachhead: 'Beachhead',
  persona_dmu: 'Persona and decision-maker',
  alternatives_competitors: 'Alternatives and competitors',
  evidence_ledger: 'Evidence ledger',
  assumptions_experiments: 'Assumptions and experiments',
  market_model: 'Market model',
  business_model_money_rules: 'Business model and money rules',
  pricing_unit_economics: 'Pricing and unit economics',
  willingness_to_pay: 'Willingness to pay',
  mvbp_kill_lines: 'MVBP and kill lines',
  gtm_first_100: 'Go-to-market (first 100)',
  team_cost_runway: 'Team, cost, and runway',
  legal_compliance: 'Legal and compliance',
  launch_operate: 'Launch and operate',
  gates_decisions_artifacts: 'Gates, decisions, and artifacts',
};

type Projection = {
  project: Project;
  revisions: PackRevision[];
  acceptedKeys: Set<string>;
  facts: Record<BusinessModelSectionKey, string[]>;
  assumptions: Record<BusinessModelSectionKey, string[]>;
  citations: Record<BusinessModelSectionKey, string[]>;
  updatedAt: Record<BusinessModelSectionKey, Date | null>;
};

export class PlanSectionAggregatorService {
  constructor(
    private readonly sql: PoolSql,
    private readonly policyService: PolicyService,
  ) {}

  async listAll(actor: {
    membership: WorkspaceMembership;
    project: Project;
  }): Promise<BusinessModelSectionCard[]> {
    this.assertRead(actor.membership);
    const projection = await this.load(actor.project);
    return BusinessModelSectionKeys.map((key) => this.toCard(key, projection));
  }

  async getSection(
    actor: { membership: WorkspaceMembership; project: Project },
    key: BusinessModelSectionKey,
  ): Promise<{ card: BusinessModelSectionCard; revisionHistory: PackRevision[] }> {
    this.assertRead(actor.membership);
    const projection = await this.load(actor.project);
    return { card: this.toCard(key, projection), revisionHistory: projection.revisions };
  }

  private assertRead(membership: WorkspaceMembership): void {
    if (!this.policyService.can(membership, 'artifact.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read the business model.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
  }

  private async load(project: Project): Promise<Projection> {
    return withWorkspaceScope(this.sql, [project.workspaceId], async (tx) => {
      const emptyFacts = emptySectionRecord<string[]>([]);
      const emptyAssumptions = emptySectionRecord<string[]>([]);
      const emptyCitations = emptySectionRecord<string[]>([]);
      const emptyUpdated = emptySectionRecord<Date | null>(null);
      const revisions = await listPackRevisionsByProjectId(tx, project.id);
      const acceptedKeys = new Set<string>();
      for (const revision of revisions) {
        const parsed = parseAcceptedKeys(revision.acceptedChanges);
        for (const key of parsed) {
          acceptedKeys.add(key);
        }
      }
      const revisionId = project.currentPackRevisionId;
      if (revisionId === null) {
        return {
          project,
          revisions,
          acceptedKeys,
          facts: emptyFacts,
          assumptions: emptyAssumptions,
          citations: emptyCitations,
          updatedAt: emptyUpdated,
        };
      }

      const [
        problems,
        beachheads,
        dmus,
        personas,
        alternatives,
        competitors,
        interviews,
        evidenceItems,
        assumptions,
        experiments,
        marketModels,
        moneyRules,
        businessModels,
        unitEconomics,
        wedges,
        wtpEvents,
        packSections,
        gates,
        decisions,
        artifacts,
        metrics,
      ] = await Promise.all([
        listProblemsByPackRevisionId(tx, revisionId),
        listBeachheadsByPackRevisionId(tx, revisionId),
        listDmusByPackRevisionId(tx, revisionId),
        listPersonasByPackRevisionId(tx, revisionId),
        listAlternativesByProjectId(tx, project.id),
        listCompetitorsByProjectId(tx, project.id),
        listInterviewsByProjectId(tx, project.id),
        listEvidenceItemsByProjectId(tx, project.id),
        listAssumptionsByProjectId(tx, project.id),
        listExperimentsByProjectId(tx, project.id),
        listMarketModelsByPackRevisionId(tx, revisionId),
        getCurrentMoneyRules(tx, project.id),
        listBusinessModelsByPackRevisionId(tx, revisionId),
        listUnitEconomicsByPackRevisionId(tx, revisionId),
        listWedgesByPackRevisionId(tx, revisionId),
        listWtpEventsByProjectId(tx, project.id),
        listPackSections(tx, revisionId),
        listGatesByProjectId(tx, project.id),
        listDecisionsByProjectId(tx, project.id),
        listArtifactsByProjectId(tx, project.id),
        listMetricDefinitionsByProjectId(tx, project.id),
      ]);
      const quotes = await listQuotesByInterviewIds(
        tx,
        interviews.map((item) => item.id),
      );
      const offers = (
        await Promise.all(businessModels.map((model) => listOffersByBusinessModelId(tx, model.id)))
      ).flat();

      const facts = { ...emptyFacts };
      const assumptionMap = { ...emptyAssumptions };
      const citations = { ...emptyCitations };
      const updatedAt = { ...emptyUpdated };

      push(facts, 'context', nonEmpty(project.geography), nonEmpty(project.founderObjective));
      updatedAt.context = project.updatedAt ?? project.createdAt;
      push(facts, 'problem', ...problems.map((item) => item.statement));
      updatedAt.problem = lastDate(problems.map((item) => item.createdAt));
      push(facts, 'beachhead', ...beachheads.map((item) => item.segmentDefinition));
      updatedAt.beachhead = lastDate(beachheads.map((item) => item.createdAt));
      push(
        facts,
        'persona_dmu',
        ...personas.map((item) => item.profile),
        ...dmus.map((item) => item.buyer ?? item.user ?? 'DMU recorded'),
      );
      updatedAt.persona_dmu = lastDate([
        ...personas.map((item) => item.createdAt),
        ...dmus.map((item) => item.createdAt),
      ]);
      push(
        facts,
        'alternatives_competitors',
        ...alternatives.map((item) => item.description),
        ...competitors.map((item) => item.name),
        ...wedges.map((item) => item.statement),
      );
      push(
        facts,
        'evidence_ledger',
        `${String(interviews.length)} interviews`,
        `${String(quotes.length)} quotes`,
        ...evidenceItems.map((item) => item.summary),
      );
      citations.evidence_ledger = evidenceItems.flatMap((item) => item.citationIds);
      push(
        assumptionMap,
        'assumptions_experiments',
        ...assumptions.filter((item) => item.status === 'untested').map((item) => item.statement),
      );
      push(
        facts,
        'assumptions_experiments',
        ...experiments.map((item) => item.hypothesis),
        ...assumptions.filter((item) => item.status !== 'untested').map((item) => item.statement),
      );
      push(
        facts,
        'market_model',
        ...marketModels.map((item) =>
          item.computedResult === null ? 'Market model drafted' : item.computedResult.formula,
        ),
      );
      if (moneyRules !== null) {
        push(
          facts,
          'business_model_money_rules',
          `${moneyRules.currency} ${moneyRules.price} per ${moneyRules.unitOfSale}`,
        );
      }
      push(
        facts,
        'business_model_money_rules',
        ...businessModels.map((item) => `${item.whoPays} pays for ${item.unitOfSale}`),
      );
      push(
        facts,
        'pricing_unit_economics',
        ...unitEconomics.map((item) =>
          item.margin === null ? 'Unit economics incomplete' : 'Margin computed',
        ),
        ...offers.map((item) => item.promise),
      );
      push(
        facts,
        'willingness_to_pay',
        ...wtpEvents.map((item) => `${item.instrument} (${item.participantClass})`),
      );
      for (const section of packSections) {
        const key = packKeyToBusiness(section.section);
        if (key === null) {
          continue;
        }
        const assertions =
          'founderAssertions' in section.body ? section.body.founderAssertions : [];
        push(facts, key, ...assertions.filter((item) => item.length > 0));
        updatedAt[key] = section.createdAt;
      }
      push(
        facts,
        'gates_decisions_artifacts',
        ...gates.map((item) => `${item.gateType}: ${item.result}`),
        ...decisions.map((item) => item.rationale),
        ...artifacts.map((item) => item.artifactType),
        ...metrics.map((item) => item.name),
      );

      for (const assumption of assumptions) {
        if (assumption.status === 'untested') {
          push(assumptionMap, 'assumptions_experiments', assumption.statement);
        }
      }

      return {
        project,
        revisions,
        acceptedKeys,
        facts,
        assumptions: assumptionMap,
        citations,
        updatedAt,
      };
    });
  }

  private toCard(key: BusinessModelSectionKey, projection: Projection): BusinessModelSectionCard {
    const knownFacts = unique(projection.facts[key] ?? []);
    const assumptions = unique(projection.assumptions[key] ?? []);
    const citations = unique(projection.citations[key] ?? []);
    const status = statusFor(key, projection.acceptedKeys.has(key), knownFacts, assumptions);
    const summary =
      knownFacts[0] ??
      assumptions[0] ??
      'Not yet known — this section is an open question, not a fact.';
    return {
      key,
      title: SECTION_TITLES[key],
      summary,
      status,
      scoreContribution: null,
      knownFacts,
      assumptions,
      citations,
      lastUpdatedAt: projection.updatedAt[key] ?? null,
      nextAction: nextActionFor(status),
    };
  }
}

function emptySectionRecord<T>(value: T): Record<BusinessModelSectionKey, T> {
  return Object.fromEntries(
    BusinessModelSectionKeys.map((key) => [key, Array.isArray(value) ? [...value] : value]),
  ) as Record<BusinessModelSectionKey, T>;
}

function push(
  target: Record<BusinessModelSectionKey, string[]>,
  key: BusinessModelSectionKey,
  ...values: Array<string | null | undefined>
): void {
  const list = target[key] ?? [];
  for (const value of values) {
    if (value !== null && value !== undefined && value.trim().length > 0) {
      list.push(value.trim());
    }
  }
  target[key] = list;
}

function nonEmpty(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.trim().length === 0) {
    return null;
  }
  return value.trim();
}

function lastDate(dates: Date[]): Date | null {
  if (dates.length === 0) {
    return null;
  }
  return dates.reduce((latest, item) => (item > latest ? item : latest));
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function parseAcceptedKeys(acceptedChanges: unknown): string[] {
  if (
    typeof acceptedChanges !== 'object' ||
    acceptedChanges === null ||
    !('sectionKeys' in acceptedChanges)
  ) {
    return [];
  }
  const keys = (acceptedChanges as { sectionKeys?: unknown }).sectionKeys;
  return Array.isArray(keys) ? keys.filter((item): item is string => typeof item === 'string') : [];
}

function packKeyToBusiness(
  section: 'mvbp' | 'gtm' | 'org_cost' | 'legal' | 'launch',
): BusinessModelSectionKey | null {
  switch (section) {
    case 'mvbp':
      return 'mvbp_kill_lines';
    case 'gtm':
      return 'gtm_first_100';
    case 'org_cost':
      return 'team_cost_runway';
    case 'legal':
      return 'legal_compliance';
    case 'launch':
      return 'launch_operate';
  }
}

function statusFor(
  _key: BusinessModelSectionKey,
  accepted: boolean,
  facts: string[],
  assumptions: string[],
): BusinessModelSectionStatus {
  if (accepted) {
    return 'accepted';
  }
  if (facts.length > 0 && assumptions.length === 0) {
    return 'supported';
  }
  if (assumptions.length > 0) {
    return 'assumption_heavy';
  }
  if (facts.length > 0) {
    return 'draft';
  }
  return 'draft';
}

function nextActionFor(status: BusinessModelSectionStatus): string {
  switch (status) {
    case 'accepted':
      return 'Keep this section current as new evidence arrives.';
    case 'supported':
      return 'Review the cited facts and accept this section if they still hold.';
    case 'assumption_heavy':
      return 'Replace assumptions with cited research or founder evidence.';
    default:
      return 'Capture founder input or run research for this section.';
  }
}
