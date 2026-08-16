# Business Plan Harness — greeun/business-plan-harness

**Repo:** https://github.com/greeun/business-plan-harness  
**License:** MIT  
**Stars:** 0  
**Shape:** Claude Code skill. Planner → Generator → Evaluator. Adapted from Anthropic’s *Harness Design for Long-Running Application Development* (Prithvi Rajasekaran, 24 Mar 2026).

## Why it exists (the important idea)

If you ask one model to write a business plan and then grade it, it will grade itself generously. Anthropic’s observation in coding — **self-evaluation failure** — is worse for business writing: there is no compiler. Financials are wishful. TAMs are top-down “1% of a huge market.”

The harness **splits roles into separate agent calls** that only communicate through files. The Generator is forbidden to self-grade. The Evaluator is adversarial and must not dismiss issues.

## Mechanics

1. Planner writes `spec.md` + `sprint-playbook.md` (no generic templates).
2. Four research sprints, each with a **negotiated contract**:
   - S1 market / competition / ecosystem  
   - S2 problem / customer / persona  
   - S3 business model / unit economics / financials  
   - S4 integrate the plan  
3. Per sprint: contract → Generator → Evaluator. Fail → revise (capped).
4. Final Evaluator pass: 4 scored axes + 8 binary gates.
5. Human checkpoint on **financial input assumptions** (not on the arithmetic).

**Weighted axes:** Problem/market (1×), Differentiation (2×), Feasibility/unit economics (2×), Measurability (1×). Pass only if every criterion ≥ 4.

**Binary gates include:** value traces to problem, customer specificity, named competitor comparison, every number sourced or labeled `ASSUMPTION:`, no placeholders, infographic-fit, **financial coherence** (totals reconcile; money rules single-sourced).

## Output modes

Lean 1-pager; standard narrative plan; investor IR plan; government-grant form; **full ~16-deliverable package** with HTML dashboard (BMC, Sankey, TAM rings, AARRR, risk heatmap, Gantt as inline SVG).

## Strengths

- Best published **evaluation architecture** for this domain.
- Single-sourced money rules (gate G-h) — the exact bug every LLM plan has.
- `assumptions_and_risks.md` as a required artifact.
- Infographic-first: numbers that only live in tables fail a gate.

## Weaknesses

- Still produces **documents**, not a company. No interviews executed, no ops.
- 0 stars; Claude-only.
- Grant/IR modes can tempt users to optimize for forms.

## What to steal (high priority)

- Separate critic process (different context, different prompt, files only).
- Sprint contracts with observable checks.
- `ASSUMPTION:` labeling as a schema, not a style guide.
- Financial coherence tests we can write in code (not LLM opinion).
- Human review of *inputs* to the model (conversion, CAC, capture rate).

## What to avoid

- Infinite revise loops (they cap 5–15; we should too).
- Letting the Evaluator become a rubber stamp by sharing the Generator’s chain of thought.
