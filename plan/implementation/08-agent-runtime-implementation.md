# Agent runtime implementation

Implements `plan/02-orchestration-and-agent-contracts.md` and `plan/05-model-providers-and-code-mode.md` as concrete classes in `packages/agent-runtime`, executed exclusively inside `apps/worker` (per `01-monorepo-and-project-structure.md` §7 rule 5).

## 1. Package layout

```
packages/agent-runtime/src/
├── providers/
│   ├── registry.ts          # buildModel(profile, connection): LanguageModel — wraps AI SDK provider factories
│   ├── anthropic.ts
│   ├── openai.ts
│   ├── bedrock.ts
│   ├── gateway.ts
│   ├── openai-compatible.ts   # Ollama / LM Studio / vLLM
│   └── capability-probe.ts     # low-risk test call used by provider.connect
├── profiles/
│   └── model-profiles.ts        # Coordinator, ResearchWorker, Extractor, Critic, FinancialAnalyst, VisionDocument, CodePlanner, Local
├── agents/
│   ├── orchestrator.ts
│   ├── evidence-librarian.ts
│   ├── critic.ts
│   ├── interview-coach.ts
│   ├── research-crew.ts
│   ├── business-model-analyst.ts
│   ├── pricing-analyst.ts
│   ├── wtp-analyst.ts
│   ├── assumption-analyst.ts
│   └── registry.ts              # AgentDefinition lookup by name+version, backed by agent_definitions table
├── contracts/
│   ├── sprint-contract.ts        # SprintContract builder + validator
│   ├── agent-contract.ts          # Per-invocation contract type (plan/02 §3)
│   └── output-schema.ts            # Zod schemas every agent output must satisfy
├── orchestration/
│   ├── orchestrator-runtime.ts     # Diagnose → Contract → Fan out → Synthesize (Stages 1-4)
│   ├── sprint-runner.ts             # Top-level entrypoint called by apps/worker/queues/sprint.worker.ts
│   ├── worker-pool.ts                 # Bounded-parallelism fan-out executor
│   └── stall-detector.ts               # Round/stall counters, replanning triggers
├── critique/
│   └── critic-runtime.ts               # Stage 5: separate-context evaluation
├── code-mode/
│   ├── sandbox.ts                       # QuickJS-backed isolated execution
│   └── policy.ts                          # Enforces plan/05 §7 boundary (no network/db/secrets)
├── streaming/
│   └── event-normalizer.ts               # AI SDK stream parts + domain events -> StreamEvent (plan/13 §5)
├── mcp/
│   ├── mcp-bridge.ts                       # Loads a user's enabled user_mcp_servers, wraps their tools for a run
│   ├── mcp-client-pool.ts                   # Short-lived createMCPClient() instances, closed at the end of each run
│   └── mcp-risk-policy.ts                     # Forces every MCP-sourced tool to risk_class = 'side_effect'
└── usage/
    └── usage-recorder.ts                   # Writes agent_runs + usage_records rows
```

## 2. Provider registry

```ts
// providers/registry.ts (shape)
export type ProviderFamily =
  | 'ai_gateway' | 'anthropic' | 'openai' | 'bedrock' | 'openai_compatible' | 'ollama';

export interface ProviderCapabilities {
  streaming: boolean;
  toolCalling: boolean;
  structuredOutput: boolean;
  vision: boolean;
  embeddings: boolean;
  longContext: boolean;
  codeGeneration: boolean;
  nativeSearch: boolean;
  dataResidency: 'in_region' | 'unspecified';
}

export async function buildModel(
  connection: ProviderConnection,     // @foundry/domain entity
  modelId: string,
): Promise<{ model: LanguageModel; capabilities: ProviderCapabilities }> {
  switch (connection.providerFamily) {
    case 'anthropic': return anthropicProvider(connection, modelId);
    case 'openai': return openaiProvider(connection, modelId);
    case 'bedrock': return bedrockProvider(connection, modelId);   // reuses ECS task IAM role when connection.authMode === 'aws_iam_role'
    case 'ai_gateway': return gatewayProvider(connection, modelId);
    case 'openai_compatible':
    case 'ollama': return openAICompatibleProvider(connection, modelId);
  }
}
```

Every provider module returns both the AI SDK `LanguageModel` instance **and** a static `ProviderCapabilities` object (hand-maintained per provider/model family, refreshed by `capability-probe.ts`'s periodic health check). `model-profiles.ts` checks required capabilities against this object before a task is assigned — this is the concrete implementation of `plan/05` §1's "the app must check capabilities before assigning a task."

Credentials never leave this module: `connection.credentialRefEncrypted` is resolved to a real secret only inside the specific provider factory, immediately before constructing the AI SDK client, and is never logged, returned, or attached to a span attribute (`12-observability-and-cost-management.md` §4).

## 3. Model profiles

```ts
// profiles/model-profiles.ts
export const MODEL_PROFILES = {
  coordinator: { requiredCapabilities: ['toolCalling', 'structuredOutput'], maxCostPerRunUsd: 0.50 },
  researchWorker: { requiredCapabilities: ['toolCalling'], maxCostPerRunUsd: 0.15 },
  extractor: { requiredCapabilities: ['structuredOutput'], maxCostPerRunUsd: 0.05 },
  critic: { requiredCapabilities: ['structuredOutput'], maxCostPerRunUsd: 0.30 },
  financialAnalyst: { requiredCapabilities: ['structuredOutput'], maxCostPerRunUsd: 0.20 },
  visionDocument: { requiredCapabilities: ['vision', 'structuredOutput'], maxCostPerRunUsd: 0.10 },
  codePlanner: { requiredCapabilities: ['codeGeneration', 'structuredOutput'], maxCostPerRunUsd: 0.15 },
  local: { requiredCapabilities: [], maxCostPerRunUsd: 0 },
} as const satisfies Record<string, ModelProfileSpec>;
```

Each entry also carries a **fallback candidate list** (ordered provider/model pairs) and a **data-residency restriction** field, matching `plan/05` §3. `ProviderService` (in `packages/policy`) resolves `(workspaceId, profile)` → an ordered candidate list at runtime, so the profile table above never hardcodes a specific model ID — that mapping is workspace-configurable data, not code.

## 4. Agent definitions

Each file in `agents/` exports a plain object matching the `AgentDefinition` shape, **not a class with hidden state** — an agent is data (instructions + capabilities + policy defaults) plus a pure `run` function, so replaying a past run with the recorded prompt/model version is a matter of re-loading the same data:

```ts
// agents/critic.ts
export const criticAgentV1: AgentDefinition = {
  name: 'critic',
  version: 1,
  modelProfile: 'critic',
  instructions: CRITIC_INSTRUCTIONS_V1,        // long-form text, stored verbatim in agent_definitions.instructions_text
  toolAllowlist: ['pack.read', 'evidence.search', 'citation.check', 'gate.evaluate'],
  outputSchema: CriticOutputSchema,             // Zod — GO/PIVOT/KILL recommendation + instant-fail flags
  mustNot: [
    'write the plan it is grading',
    'receive the generator\'s private reasoning',
  ],
};
```

`agents/registry.ts` loads the *current* version of each named agent from the `agent_definitions` table at worker boot (cached in memory, invalidated on a config-reload signal) — this makes prompt edits a data change (new row, new version) rather than a code deploy, satisfying `plan/05` §9 ("prompt edits must create a new version").

## 5. Orchestrator runtime (Stages 1–7 from `plan/02` §4)

```ts
// orchestration/sprint-runner.ts
export async function runSprint(job: SprintJobData, io: SprintRunnerIO): Promise<SprintOutcome> {
  const snapshot = await loadPackSnapshot(job.packRevisionId);       // Stage 1 input
  const contract = await orchestrator.contract(snapshot, job);        // Stage 2
  await io.publish({ type: 'sprint_progress', sprintId: job.sprintId, progress: { stage: 'contracted' } });

  const workerResults = await runWorkerPool(contract, snapshot, io);  // Stage 3 (fan out)
  const synthesis = await orchestrator.synthesize(workerResults, snapshot); // Stage 4

  const critique = await criticRuntime.evaluate(synthesis, contract, snapshot); // Stage 5, isolated context
  const gateResult = await gateService.evaluate(snapshot.projectId, contract.gateType);

  const outcome = await packService.proposeRevision(synthesis, critique, gateResult); // Stage 6 input
  await io.publish({ type: 'proposal_ready', runId: contract.id, proposal: outcome.summary });

  return closeSprintReport(job.sprintId, outcome);                    // Stage 7
}
```

- `runWorkerPool` (in `worker-pool.ts`) enforces the fan-out rule from `plan/02` §4 Stage 3: workers only run in parallel when `contract.workers[i].readsOnly === true` or their declared write targets are disjoint. It is a `Promise.allSettled` over bounded concurrency (default 3, from `contract.maxWorkers`), not an unbounded `Promise.all`.
- `stall-detector.ts` increments a round/stall counter on every orchestrator↔worker loop and raises a `sprint_stalled` domain event when `contract.maxStalls` is hit, per `plan/02` §9's "worker disagreement" and "budget exhausted" failure rows.
- The critic (`critique/critic-runtime.ts`) is invoked with a **fresh** AI SDK conversation containing only the pack snapshot, contract, produced artifacts, cited evidence, and rubric — the generator's message history is never passed in, enforcing `plan/02` §2's "must not... hide defects to finish the sprint."

## 6. Stream event normalization

`streaming/event-normalizer.ts` is the only place raw AI SDK `UIMessageStreamPart`s and raw domain events are converted into the `StreamEvent` union from `plan/13` §5 / `02-web-frontend-architecture.md` §6:

```ts
export function normalize(part: AISdkStreamPart | DomainEvent, ctx: RunContext): StreamEvent | null {
  switch (part.type) {
    case 'text-delta': return { type: 'text_delta', runId: ctx.runId, delta: part.textDelta };
    case 'tool-call': return { type: 'tool_planned', runId: ctx.runId, tool: summarizeToolPlan(part) };
    case 'tool-result': return { type: 'tool_completed', runId: ctx.runId, toolCallId: part.toolCallId, result: summarizeToolResult(part) };
    // ... one case per AI SDK part type and per relevant DomainEvent type
    default: return null; // deliberately drop anything not in the approved vocabulary — never forward unknown shapes to clients
  }
}
```

This function is the enforcement point for `plan/13` §5's "Do not stream raw provider objects directly to clients" — it is a `switch`, not a passthrough, so adding a new stream event requires touching this file explicitly.

## 7. Code mode sandbox

Implements the boundary in `plan/05-model-providers-and-code-mode.md` §7 exactly:

```ts
// code-mode/sandbox.ts
export async function runCodeMode(input: {
  code: string;
  toolResults: Record<string, JsonValue>;   // only JSON in/out crosses the boundary
  limits: { timeoutMs: number; memoryMb: number; maxSourceBytes: number; maxResultBytes: number };
}): Promise<CodeModeResult> {
  const vm = await QuickJS.newContext();
  try {
    installOnly(vm, ['JSON', 'Math', 'Array', 'Object', 'String', 'Number', 'Date']); // no fetch, no fs, no process, no require
    return await withTimeout(vm.evalCode(input.code, input.toolResults), input.limits.timeoutMs);
  } finally {
    vm.dispose();
  }
}
```

Hard rules enforced in `code-mode/policy.ts` before `runCodeMode` is ever called:

- Never invoked from `apps/web`'s request path — only from `apps/worker`'s sprint/render processors.
- The tool manifest passed to a code-mode-eligible agent contains **zero** `side_effect`-risk-class tools (checked against `tool_definitions.risk_class`); if an agent's plan requests one, the call is rejected and a normal `ApprovalRequest`/draft action is created instead (`plan/05` §7's explicit fallback).
- Every invocation is recorded (source hash, byte size, duration, tool calls made) as a `tool_calls` row with `tool_definition_id` pointing at a synthetic `code_mode.execute` tool definition, so it is auditable like any other tool call.

## 8. Tool registry integration

`packages/tools` defines each tool family from `plan/07-artifacts-and-tool-catalog.md` §7 as an AI SDK `tool()` definition plus a matching row in `tool_definitions`:

```ts
// packages/tools/src/pack-read.ts
export const packReadTool = tool({
  description: 'Read selected sections of the current pack revision for this project.',
  inputSchema: PackReadInputSchema,
  execute: async (input, { experimental_context }) => {
    const { services, actor } = experimental_context as ToolExecutionContext;
    return services.packService.getSections(input.projectId, input.sections); // goes through the domain service, never raw db
  },
});
```

Per-sprint tool manifests (`plan/07` §9) are assembled by `agent-runtime`'s contract builder: it starts from the full registry, filters by `agentDefinition.toolAllowlist`, then filters again by the current gate/phase/policy/budget (via `PolicyService.filterTools(...)`) before the list is ever handed to the AI SDK's `generateText`/`streamText` call. An agent never sees a tool it is not currently allowed to call — there is no client-side "the model chose not to use it" trust boundary.

Tools the `mcp-bridge` (§11) adds for the acting user are merged into the registry's output **before** this same filter runs — an MCP-sourced tool is never given a bypass lane. Because `mcp-risk-policy.ts` stamps every MCP tool as `side_effect` regardless of what the MCP server's own metadata claims, `PolicyService.filterTools` treats it exactly like a built-in write tool: it survives the filter, but calling it always produces an `ApprovalRequest` rather than an immediate execution (§11).

## 9. Usage and cost accounting

Every agent invocation, on completion (success or failure), writes exactly one `agent_runs` row and one or more `usage_records` rows via `usage/usage-recorder.ts`, using the token/cost fields the AI SDK returns on the result object (`result.usage`, `result.providerMetadata`). `BudgetService` reads the same rows to compute `budget_ledger_entries` settlement (reservation → actual) at sprint close, implementing `plan/02` §8 precisely.

## 10. Interactive single-turn calls from `apps/web`

Not every model call is a full sprint. A single clarification exchange on the Founder Desk (`project.answerClarification`) may call `orchestrator.diagnose(...)` directly from a tRPC procedure in `apps/web`, streaming the response back over the SSE endpoint the same way a worker-driven sprint does. This is the **only** case where `agent-runtime` code executes inside `apps/web` rather than `apps/worker`, and it is restricted to: no tool with `risk_class` above `compute`, a hard wall-clock timeout (15s), and never invoking code mode. Anything that needs a `draft` or `side_effect` tool, or that the orchestrator decides warrants parallel workers, is escalated to a `sprint` job instead.

## 11. User-level MCP server bridge

Implements the "user-added MCP servers" capability from `00-tech-stack-and-versions.md` §6a: a founder can register their own Model Context Protocol server (e.g., a company's internal knowledge base, a niche SaaS's MCP endpoint) and have its tools show up inside their own sprints, without a platform engineer wiring anything ahead of time.

```ts
// mcp/mcp-bridge.ts (shape)
export async function loadUserMcpTools(
  userId: UserId,
): Promise<Record<string, Tool>> {
  const servers = await mcpServerRepository.listEnabledForUser(userId); // user_mcp_servers, 06-database-schema.md §7
  const toolSets = await Promise.all(servers.map(loadOneServerToolSet));
  return Object.assign({}, ...toolSets); // name collisions are prefixed with the server name, never silently dropped
}

async function loadOneServerToolSet(server: UserMcpServer): Promise<Record<string, Tool>> {
  const client = await createMCPClient({
    transport: {
      type: server.transport, // 'http' | 'sse'
      url: server.url,
      headers: server.headersEncrypted ? { Authorization: await decrypt(server.headersEncrypted) } : undefined,
      redirect: 'error', // never silently follow a redirect to a different host — SSRF guard
    },
  });
  try {
    const rawTools = await client.tools();
    return applyMcpRiskPolicy(server, rawTools); // mcp-risk-policy.ts: force risk_class = 'side_effect', prefix names with `mcp_${server.name}_`
  } finally {
    await client.close(); // one short-lived client per run, never held open across runs — mcp-client-pool.ts enforces this
  }
}
```

Key rules:

- **User-scoped, not workspace-scoped.** `loadUserMcpTools` takes the *acting user's* ID, matching the product decision to keep MCP "user level" for now — a teammate in the same workspace never inherits another founder's MCP servers, and a sprint's tool manifest is therefore not fully deterministic from `projectId` alone; it depends on which user triggered the run. This is called out explicitly because it is the one place in the system where that is true.
- **Every MCP tool is untrusted by default.** `mcp-risk-policy.ts` ignores whatever risk hint an MCP server's own tool metadata provides and always classifies the tool as `side_effect`. Concretely this means every MCP tool call — even one that is "just a search" from the server's own point of view — produces an `ApprovalRequest` before it executes (§8, `09-authentication-and-security.md` §7a), through the exact same approval UI as a built-in write tool.
- **`mcpServer.add` and `mcpServer.testConnection` (`05-api-and-backend-architecture.md` §3) run the same `loadOneServerToolSet` probe** purely to list available tools and confirm reachability — this path never executes a tool, only calls `client.tools()`/`listTools()`.
- **SSRF guard.** Before a URL is ever connected to (on add, on test, and on every run), it is resolved and checked against private/link-local/loopback IP ranges (`09-authentication-and-security.md` §7a); a server whose hostname resolves to an internal address is rejected outright, since an ECS task connecting to an attacker-supplied internal URL is a classic SSRF path into the VPC.
- **No code-mode access.** Because every MCP tool is `side_effect`-classified, §7's code-mode rule ("zero `side_effect` tools in a code-mode-eligible manifest") already excludes MCP tools from code mode without any MCP-specific logic being needed there.
- **Auditable like any other tool.** A successful MCP tool call is recorded as an ordinary `tool_calls` row (`06-database-schema.md` §7), with `tool_definitions.name` set to the prefixed `mcp_<server>_<tool>` name and `input_json`/`output_json` populated the same as a built-in tool — there is no separate, less-audited path for MCP activity.
