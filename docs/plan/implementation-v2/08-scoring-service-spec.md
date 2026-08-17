# Scoring service specification — `@foundry/scoring`

**Implements:** `docs/02-product-requirements/01-shared-product-requirements.md` §7; `04-worker-backend-requirements.md` §9.
**Package:** new `packages/scoring`, peer to `packages/policy` — same shape (`package.json` depending only on `@foundry/domain` and `@foundry/config`, pure functions, no DB/network access; the caller passes in already-fetched rows, exactly like `packages/policy/src/gate-a.ts` already does).

## 1. Why a new package instead of extending `@foundry/policy`

`packages/policy` owns **gates** (binary/qualitative pass-fail-waived-deferred functions) and **calculators** (market/unit-economics/sensitivity — deterministic finance math). Scoring is a third, distinct concern: a weighted rubric that *consumes* gate results and calculator outputs as inputs alongside evidence counts, citation quality, and assumption states. Keeping it separate keeps `policy` focused and keeps the scoring rule version independently bumpable from gate rule versions (backend requirements §9 requires the scoring service to be "deterministic from stored inputs" and versioned — bundling it with gates would couple two independent versioning lifecycles).

## 2. Rubric (shared requirements §7.1, verbatim weights)

| Dimension | Weight | Key | Primary inputs |
|---|---:|---|---|
| Customer clarity | 15 | `customer_clarity` | `problems`, `beachheads`, `personas`, `dmus` — specificity (non-empty, non-generic text length/keyword heuristics kept intentionally simple and inspectable), whether a `dmu` role is filled |
| Evidence strength | 20 | `evidence_strength` | `interviews` (count, `participantType = 'non_friend'` ratio), `quotes` linked, `evidence_items`/`citations` count and source diversity, Gate A result |
| Market support | 15 | `market_support` | `alternatives`, `competitors`, `market_models` (has a computed result with cited inputs), `wedges` |
| Business economics | 15 | `business_economics` | `money_rules.isCurrent`, `reconcileMoneyIdentities` output (from `packages/policy/src/calculators/reconcile.ts`, reused), `unit_economics_models` completeness |
| Willingness to pay | 15 | `willingness_to_pay` | `wtp_events` (independent-prospect ratio, instrument credibility), Gate B result |
| Execution readiness | 10 | `execution_readiness` | `evaluateMvbpScope` result (reused from `packages/policy/src/mvbp-scope.ts`), `metric_definitions`/`metric_observations` presence, Gate C result |
| Risk control | 10 | `risk_control` | `assumptions` tested-vs-open ratio, legal/compliance checklist section completeness, defined kill lines |

Weights sum to 100 and are re-exported from `@foundry/scoring` as `ScoreDimensionWeights` for UI display (`02-domain-model-delta.md` §4) — the UI never hand-codes the weights.

## 3. Calculation contract

```ts
interface ScoringInputs {
  packRevisionId: PackRevisionId;
  problems: Problem[];
  beachheads: Beachhead[];
  personas: Persona[];
  dmus: Dmu[];
  alternatives: Alternative[];
  competitors: Competitor[];
  marketModels: MarketModel[];
  interviews: Interview[];
  quotes: Quote[];
  evidenceItems: EvidenceItem[];
  citations: Citation[];
  assumptions: Assumption[];
  moneyRules: MoneyRules[];
  unitEconomicsModels: UnitEconomicsModel[];
  wtpEvents: WtpEvent[];
  metricDefinitions: MetricDefinition[];
  metricObservations: MetricObservation[];
  gateA: GateResult; gateB: GateResult; gateC: GateResult;
  mvbpScopeResult: MvbpScopeResult;
}

function calculateScore(inputs: ScoringInputs, ruleVersion: string): PlanScore;
```

Every dimension function returns `{ raw: 0-5; basis: 'known' | 'insufficient_data' }` before weighting — implementing shared requirements §7.1's "missing data is scored as unknown, not as a neutral average" literally: a dimension with zero qualifying input rows returns `basis: 'insufficient_data'` and contributes `0` to the overall score while being rendered distinctly (not as a mid-scale "3/5") wherever the UI shows it, per `06-web-frontend-ia-delta.md` §2 and §7.

`reasons: ScoreReason[]` is produced by each dimension function returning up to 3 human-readable reasons tied to the specific rows that drove its score (e.g. "2 of 3 interviews are with friends, which does not count as independent validation" — directly reusing the language pattern already established in `packages/policy/src/gate-a.ts`'s existing failure messages). `topActions: ScoreImprovementAction[]` is the union of the single highest-leverage suggested action per dimension, ranked by `weight * (5 - raw)` (i.e., the largest weighted point gap), capped at 3 — this directly implements "the smallest set of actions likely to improve it" (shared requirements §7.1) as an explicit, testable formula rather than a second model call.

## 4. Determinism and no model calls

`calculateScore` is pure arithmetic and string templating over already-fetched rows — no `generateText`/`generateObject` call, no network access, matching backend requirements §9's "calculate scores deterministically from stored inputs." This also makes it trivially unit-testable with fixture rows (`10-testing-and-eval-delta.md` §2) and cheap enough to run synchronously inside the mutation call sites listed in `01-gap-analysis-and-decisions.md` D18, with no queue.

## 5. `ScoringService` (`apps/web/server/services/scoring-service.ts`)

Thin orchestration layer that fetches the rows `calculateScore` needs via the existing repositories (no new query logic beyond simple `WHERE project_id = $1` selects, all of which already exist or are added in `03-database-schema-delta.md` §3), calls `calculateScore`, and persists the result to `plan_scores`. Exposed methods:

- `recalculate(projectId)` — call sites: `PackService.acceptRevision`, `EvidenceService`/`InterviewService` write paths, `MoneyRulesService.setCurrent`, `ExperimentService.recordWtp`, `MetricService.recordObservation` (exactly backend requirements §9's recalculation trigger list).
- `getCurrent(projectId)` / `getForRevision(revisionId)` / `getHistory(projectId, limit)` — thin reads backing `score.ts` (`04-backend-services-and-trpc-delta.md` §6).

## 6. Rule versioning

`ruleVersion` is a plain semantic string (`"2026-08-1"`) baked into `@foundry/scoring`'s exported constant, bumped whenever a dimension function's weights or heuristics change — following the exact same "prompt/agent-definition version bump" discipline already required by `docs/plan/implementation/13-coding-standards-and-conventions.md`'s PR definition of done, extended here to scoring rules. Historical `plan_scores` rows keep their original `rule_version` so score trends remain honest about which rule produced them (never silently re-scored in place).

## 7. Explicit non-goal

The score is never used to gate or block any procedure (decision D12) and is never presented as a success guarantee (backend requirements §9's closing line, shared requirements §7.1) — the UI copy for this is a product/content concern (`06-web-frontend-ia-delta.md` §7), not a backend enforcement concern, but no backend code path may be added later that rejects a mutation because of a low score, and any future PR attempting that must be rejected in review as inconsistent with this decision.
