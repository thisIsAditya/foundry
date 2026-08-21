import {
  BUILD_PROMPT_INSTRUCTIONS_V1,
  BUSINESS_MODEL_ANALYST_INSTRUCTIONS_V1,
  COMPLIANCE_INSTRUCTIONS_V1,
  GTM_FIRST_100_INSTRUCTIONS_V1,
  IP_PRIVACY_INSTRUCTIONS_V1,
  LAUNCH_INSTRUCTIONS_V1,
  LEGAL_GUIDE_INSTRUCTIONS_V1,
  OPS_RUNTIME_INSTRUCTIONS_V1,
  ORG_COST_INSTRUCTIONS_V1,
  PRD_SCOPER_INSTRUCTIONS_V1,
  PRICING_ANALYST_INSTRUCTIONS_V1,
} from '../agents/instructions.js';
import type { AgentSkill } from './types.js';

/**
 * Reframes the 12 existing specialist instruction constants (`agents/instructions.ts`) as
 * selectable skills any `FoundryAgent` run can fold in, instead of each one being pinned to a
 * fixed sprint-worker `agent_definitions.name` row. Plus one new skill, `competitor_research`,
 * directly addressing the founder-reported bug where the co-founder re-asked for a problem
 * statement and target segment that were already on file (plan §"Why this is necessary").
 */
export const FOUNDRY_SKILLS: readonly AgentSkill[] = [
  {
    id: 'competitor_research',
    title: 'Competitor research',
    whenToUse:
      'founder asks about competitors, competitive landscape, alternatives, rivals, who else solves this, market comparison, differentiation',
    instructions: `You are researching competitors for the founder. Ground the request in the plan context already assembled above (problem statement, beachhead segment, personas) — if a problem and segment are already on file, use them directly and do not ask the founder to re-explain who the target user is. Only ask one targeted clarifying question first if the problem or segment is genuinely missing from context. Prefer start_research or create_job with a specific objective naming the known segment over answering from memory. Never invent named competitors, funding amounts, pricing, or market share — cite research tools/jobs for anything you cannot verify from context.`,
    toolAllowlistAdditions: ['academic_search', 'market_report_search'],
  },
  {
    id: 'business_model_analyst',
    title: 'Business model analyst',
    whenToUse:
      'revenue model, monetization, who pays, who benefits, unit of sale, money rules, billing frequency, pricing model structure',
    instructions: BUSINESS_MODEL_ANALYST_INSTRUCTIONS_V1,
  },
  {
    id: 'pricing_analyst',
    title: 'Pricing and unit economics analyst',
    whenToUse:
      'pricing, packaging, unit economics, LTV, CAC, margin, payback, sensitivity analysis, willingness to pay',
    instructions: PRICING_ANALYST_INSTRUCTIONS_V1,
    toolAllowlistAdditions: [
      'unit_economics_calculator',
      'sensitivity_calculator',
      'market_calculator',
    ],
  },
  {
    id: 'prd_scoper',
    title: 'PRD / MVBP scoper',
    whenToUse:
      'scope the MVBP, minimum viable business product, feature list, kill lines, time box, what to build first',
    instructions: PRD_SCOPER_INSTRUCTIONS_V1,
    toolAllowlistAdditions: ['mvbp_scope_check'],
  },
  {
    id: 'build_prompt_writer',
    title: 'Build prompt writer',
    whenToUse:
      'write a build prompt, generate a prompt for lovable bolt v0 cursor, produce a concierge runbook, hand off to a builder',
    instructions: BUILD_PROMPT_INSTRUCTIONS_V1,
    toolAllowlistAdditions: ['builder_prompt.generate'],
  },
  {
    id: 'gtm_first_100',
    title: 'GTM first-100 planner',
    whenToUse:
      'go to market, first 100 customers, distribution channel, how to get customers, acquisition plan',
    instructions: GTM_FIRST_100_INSTRUCTIONS_V1,
  },
  {
    id: 'org_cost_planner',
    title: 'Org and cost planner',
    whenToUse: 'team, hiring, org design, monthly burn, runway, cost structure, stack choice',
    instructions: ORG_COST_INSTRUCTIONS_V1,
  },
  {
    id: 'legal_guide',
    title: 'India legal guide',
    whenToUse:
      'entity formation, incorporation, SPICe, legal structure, company registration in India',
    instructions: LEGAL_GUIDE_INSTRUCTIONS_V1,
    toolAllowlistAdditions: ['legal_checklist.draft'],
  },
  {
    id: 'ip_privacy',
    title: 'IP and privacy drafter',
    whenToUse: 'trademark, IP assignment, privacy notice, data protection, terms of service draft',
    instructions: IP_PRIVACY_INSTRUCTIONS_V1,
  },
  {
    id: 'compliance_guide',
    title: 'GST/DPDP compliance guide',
    whenToUse: 'GST, DPDP, tax compliance, filing dates, regulatory deadlines',
    instructions: COMPLIANCE_INSTRUCTIONS_V1,
  },
  {
    id: 'launch_checklist',
    title: 'Launch checklist owner',
    whenToUse:
      'launch plan, launch checklist, ready to launch, sequencing legal MVBP payment distribution',
    instructions: LAUNCH_INSTRUCTIONS_V1,
  },
  {
    id: 'ops_runtime',
    title: 'Operations runtime',
    whenToUse:
      'day-to-day operations, running the business, growth spend, ICP drift, moneyrules migration',
    instructions: OPS_RUNTIME_INSTRUCTIONS_V1,
    toolAllowlistAdditions: ['ops.migration_proposal', 'reconciliation_checker'],
  },
];
