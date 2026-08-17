# Research grounding

**Date:** 17 August 2026  
**Purpose:** Record the research used to make the design decisions in this folder. This is not a vendor comparison or legal advice.

## 1. Repository research

The design extends these existing project documents:

| Project source | Design implication |
|---|---|
| [`research/03-agent-architecture/01-conference-loop.md`](../research/03-agent-architecture/01-conference-loop.md) | Durable gated graph, budgeted Magentic sprint, separate critic, 8-agent thin slice, tool planes |
| [`research/03-agent-architecture/00-orchestration.md`](../research/03-agent-architecture/00-orchestration.md) | `CompanyPack`, MoneyRules, Gate A/B/C, human interrupts, exportable artifacts |
| [`research/03-agent-architecture/00-recommended-roster.md`](../research/03-agent-architecture/00-recommended-roster.md) | Specialist map and control-plane roles |
| [`research/03-agent-architecture/patterns/evidence-gating.md`](../research/03-agent-architecture/patterns/evidence-gating.md) | Gates are functions over structured pack data |
| [`research/03-agent-architecture/patterns/human-in-the-loop.md`](../research/03-agent-architecture/patterns/human-in-the-loop.md) | `auto → approve → forbid` action policy |
| [`research/02-idea-to-business-process/00-synthesis.md`](../research/02-idea-to-business-process/00-synthesis.md) | Problem interviews before building, WTP before MVBP, legal in parallel |
| [`research/01-competitive-landscape/00-gap-analysis.md`](../research/01-competitive-landscape/00-gap-analysis.md) | Wedge is evidence-gated incubation plus an owned company pack |

## 2. External technical sources

### Agent architecture

- [Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)  
  Supports starting with simple workflows, using routing and parallelization where they add value, and using evaluator-optimizer loops when criteria are clear.

- [Anthropic — How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)  
  Supports lead-agent planning, scoped parallel workers, external memory, artifact references instead of transcript copying, tool-use guidance, and explicit evaluation.

- [Microsoft — Magentic-One](https://www.microsoft.com/en-us/research/articles/magentic-one-a-generalist-multi-agent-system-for-solving-complex-tasks/)  
  Supports task and progress ledgers, stall detection, re-planning, worker specialization, and durable progress tracking.

- [Microsoft Agent Framework — Magentic orchestration](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/magentic)  
  Supports plan review, maximum rounds/stalls/resets, progress events, human pauses, and dynamic worker selection.

- [OpenAI — Orchestration and handoffs](https://developers.openai.com/api/docs/guides/agents/orchestration)  
  Supports the distinction between agents-as-tools, where a manager keeps reply ownership, and handoffs, where a specialist takes over.

- [OpenAI Agents SDK — human-in-the-loop](https://openai.github.io/openai-agents-python/human_in_the_loop/)  
  Supports durable approval interruptions and resume behavior.

### Vercel AI SDK and providers

- [AI SDK — Providers and models](https://ai-sdk.dev/docs/foundations/providers-and-models)  
  Supports a provider-neutral language-model interface and direct provider packages for Anthropic, OpenAI, Amazon Bedrock, and others.

- [AI SDK — Providers](https://ai-sdk.dev/providers)  
  Confirms the provider capability matrix is not uniform; the app needs task-specific capability checks.

- [AI SDK — Building agents](https://ai-sdk.dev/docs/agents/building-agents)  
  Supports reusable tool-loop agents and the need to provide a sandbox explicitly to tools that use it.

- [AI SDK — Code mode](https://ai-sdk.dev/docs/ai-sdk-core/code-mode)  
  Grounds the plan’s code-mode boundary: isolated QuickJS-style execution, server runtime, JSON crossing the sandbox boundary, execution limits, untrusted generated code, and the need to validate tools in the host application.

- [AI SDK — Tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)  
  Grounds the plan’s separation between tool schema validation, tool execution, and sandbox delegation.

- [AI SDK — Expo](https://ai-sdk.dev/docs/getting-started/expo)  
  Grounds the shared web/mobile transport approach and Expo streaming considerations.

- [AI SDK — Community Ollama provider](https://ai-sdk.dev/providers/community-providers/ollama)  
  Grounds the plan’s treatment of Ollama as a community provider and the need to validate tool-calling capability rather than assume feature parity.

- [AI SDK — OpenAI-compatible LM Studio provider](https://ai-sdk.dev/providers/openai-compatible-providers/lmstudio)  
  Grounds support for local OpenAI-compatible endpoints.

- [Vercel AI Gateway — BYOK](https://vercel.com/docs/ai-gateway/authentication-and-byok/byok)  
  Grounds managed gateway and BYOK support, request-scoped credentials, and the need to make fallback-to-system-credentials visible.

### Tool connectivity

- [Anthropic — Model Context Protocol](https://docs.anthropic.com/en/docs/agents-and-tools/mcp)  
  Grounds using MCP as an integration protocol for tools and data sources.

- [Anthropic — MCP connector](https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector)  
  Grounds remote MCP configuration, allowlists, per-tool configuration, and OAuth considerations.

## 3. Interpretation rules

- Technical provider documentation changes. The implementation team must re-check current APIs and versions before selecting packages.
- Provider capability tables are not guarantees for every model ID. Validate the exact model and endpoint in a capability test.
- Code mode is experimental and should not be treated as a security boundary by itself.
- Vendor documentation describes capability, not product reliability. Use the evaluation plan in `09-evaluation-and-observability.md`.
- External market, legal, tax, and pricing claims require separate source and freshness checks; technical sources do not validate them.

## 4. Decisions that remain intentionally vendor-neutral

This plan does not freeze:

- the durable workflow vendor;
- the exact PostgreSQL host;
- the object-storage provider;
- the vector/search provider;
- the document rendering library;
- the mobile notification service;
- the payment, CRM, accounting, or messaging integrations.

Those choices should be made after the first vertical slice establishes scale, privacy, and artifact requirements.
