# Model providers, BYOK, and code mode

## 1. Provider strategy

Use the Vercel AI SDK as the application-facing model contract. Provider selection is a runtime policy decision, not something individual agents hard-code.

Support these connection families:

| Connection family | Intended use |
|---|---|
| Vercel AI Gateway | Managed routing, model catalog, provider fallback, usage visibility, and optional request-scoped BYOK |
| Direct Anthropic | Claude-specific capabilities, enterprise arrangements, or direct data-policy requirements |
| Direct OpenAI | Responses and model-specific capabilities, enterprise arrangements, or direct data-policy requirements |
| Amazon Bedrock | AWS account, region, IAM, private networking, or AWS governance requirements |
| OpenAI-compatible endpoint | Local or self-hosted services such as LM Studio, vLLM, or compatible gateways |
| Ollama-compatible endpoint | Local developer or private-network model serving |

The provider layer should expose one internal capability model:

- text generation;
- streaming;
- structured output;
- tool calling;
- vision;
- embeddings;
- reranking;
- long context;
- code generation;
- provider-native search or fetch;
- data residency;
- usage reporting.

The app must check capabilities before assigning a task. A local model that cannot reliably call tools should not silently receive a research or approval workflow.

## 2. Provider connection object

A provider connection represents access, not a model choice.

It contains:

- connection owner: user or workspace;
- provider family;
- authentication mode;
- encrypted credential reference;
- endpoint or region;
- allowed models;
- allowed data classifications;
- fallback policy;
- spend limit;
- health status;
- last validation time;
- deletion and rotation metadata.

Credentials are never sent to the browser, mobile client, prompt, artifact, trace body, or model context.

### Authentication modes

1. Managed application credentials.
2. Workspace BYOK credentials.
3. User BYOK credentials.
4. AWS IAM role or workload identity.
5. Local/private endpoint with connector health check.

The user must be able to see which mode handled a run.

## 3. Model profiles

Agents should request a `ModelProfile`, not a raw provider model.

Suggested profiles:

| Profile | Quality requirement | Typical tasks |
|---|---|---|
| Coordinator | Strong reasoning, structured output, reliable tool selection | Orchestrator, sprint planning, synthesis |
| Research worker | Good search/tool use at lower cost | Alternatives, market, competitor research |
| Extractor | Fast, consistent structured output | Claims, tables, quotes, metadata |
| Critic | Strong adversarial reasoning and rubric adherence | Gate review, contradiction detection, instant fails |
| Financial analyst | Strong structured output plus deterministic calculator access | Unit economics interpretation and sensitivity review |
| Vision/document | Image and table understanding | Scanned PDF, charts, screenshots |
| Code planner | Safe code generation and data transformation | Spreadsheet formulas, JSON transforms, builder prompts |
| Local/private | User-selected local model with explicit capability limitations | Sensitive drafting, offline analysis, experimentation |

Each profile specifies:

- required capabilities;
- acceptable latency;
- maximum cost;
- data residency restrictions;
- minimum context;
- fallback candidates;
- whether provider-native tools are allowed;
- whether the task may run on a local model.

## 4. BYOK behavior

BYOK should be a first-class onboarding choice:

1. Select provider.
2. Enter or authorize credentials.
3. Validate connection with a low-risk capability test.
4. Select allowed workspaces/projects.
5. Set a spend cap.
6. Choose whether the provider may be used for sensitive documents.
7. Choose explicit fallback behavior.

Never silently fall back from a user’s provider to BusinessGenerator credentials. If a managed gateway can fall back to system credentials, the product must make that behavior explicit and allow a no-fallback privacy mode.

Show:

- provider and model;
- whether BYOK or managed credentials were used;
- input/output usage;
- estimated and actual cost;
- fallback event;
- data classification sent;
- any provider-specific limitation.

## 5. Local model support

Local inference is not one feature; it is a connectivity and capability contract.

### Local endpoint modes

| Mode | Boundary | Product behavior |
|---|---|---|
| Developer machine | Ollama or LM Studio on the founder’s computer | Use a desktop/local connector; a cloud mobile client cannot assume `localhost` is reachable |
| Private network | Hosted vLLM/Ollama/OpenAI-compatible service | Store endpoint metadata and use network policy, TLS, and health checks |
| Fully local | App, files, index, and model remain on-device | Later scope; requires a different sync and storage design |

### Local-model warnings

The UI must show when a local model lacks:

- tool calling;
- structured output guarantees;
- vision;
- sufficient context;
- embedding compatibility;
- reliable JSON;
- multilingual support;
- required latency.

If the task needs web research but inference is local, the user must choose whether web content may leave the local boundary. The app should not imply that using a local model automatically makes all data local.

## 6. Vercel AI SDK role

Use the SDK for:

- provider-neutral generation;
- streaming text and structured UI messages;
- tool definitions and validation;
- reusable tool-loop agents;
- usage metadata;
- provider-specific options behind adapters;
- UI transports for web and Expo.

Keep outside the SDK:

- durable workflow state;
- pack revisions;
- approvals and policy;
- secrets;
- source registry;
- budget ledger;
- artifact dependency graph;
- final gate decisions.

## 7. Code mode

Code mode is useful, but it must be treated as an untrusted computation capability.

### Appropriate uses

- transform JSON returned by approved tools;
- filter and join structured records;
- calculate deterministic tables when the actual calculator is still authoritative;
- prepare spreadsheet data;
- normalize document extraction output;
- generate a small chart specification;
- compare structured alternatives;
- run bounded, read-only data analysis.

### Inappropriate uses

- arbitrary shell access;
- accessing the database directly;
- reading secrets or environment variables;
- network requests from generated code;
- sending email or messages;
- charging a payment method;
- publishing a page;
- filing government forms;
- deleting data;
- changing canonical MoneyRules without domain validation.

### Runtime boundary

Current AI SDK code mode runs generated JavaScript or TypeScript in an isolated QuickJS-style sandbox, requires a Node server runtime, is not a browser/Edge capability, and has execution limits. It is not a full TypeScript compiler. Tool inputs and outputs cross the boundary as JSON.

Therefore:

- execute code mode only in a server-side worker;
- use a separate hardened sandbox for Python, large files, or system commands;
- expose only narrow, validated tools;
- enforce time, memory, source-size, result-size, and tool-call limits;
- record generated program metadata and tool calls;
- treat tool approval as a server policy concern.

The current code-mode path does not provide a reliable nested approval flow for every tool call. Side-effecting tools must not be exposed through code mode. If code mode requests one, reject it and create a normal approval request or draft action instead.

## 8. Provider fallback

Fallback is selected by task policy, not by a generic retry loop.

Fallback rules must specify:

- whether fallback is allowed;
- approved alternative providers/models;
- maximum additional spend;
- whether data classification permits the alternative;
- whether tool and structured-output capabilities are equivalent;
- whether the user must approve;
- how the fallback is displayed and audited.

No fallback is allowed for:

- sensitive private documents without explicit policy;
- legal or compliance conclusions where source/model capability changes the result;
- side-effect execution;
- financial calculations that lose deterministic checks.

## 9. Prompt and model versioning

Record with every run:

- agent definition version;
- system instruction version;
- task contract version;
- model profile;
- provider and model ID;
- provider options relevant to behavior;
- tool definitions and versions;
- retrieval snapshot IDs;
- output schema version;
- usage and latency.

Prompt edits must create a new version. Replaying an old run should use the recorded versions or clearly state that it is a new replay.

## 10. Privacy modes

Expose a simple project-level choice:

| Mode | Allowed model routing |
|---|---|
| Standard | Managed or BYOK providers; normal web research |
| Private | BYOK/private endpoint only; no managed fallback; restricted external tools |
| Local-first | Local model preferred; external web and artifact services require explicit consent |
| Offline draft | Local files and local model only; no web search or external side effects |

The mode is a policy constraint, not a marketing label. Show the actual route for every run.
