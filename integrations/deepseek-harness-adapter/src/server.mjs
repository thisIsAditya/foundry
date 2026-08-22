import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT ?? '8787');
const token = requireEnv('HARNESS_ADAPTER_TOKEN');
const sdkPath = requireEnv('DSH_SDK_CLIENT_PATH');
const jsonrpcAgentPath = requireEnv('DSH_JSONRPC_AGENT_PATH');
const configPath = process.env.DSH_CORDIS_CONFIG ?? join(root, 'config', 'cofounder.cordis.yml');
// Mantle's OpenAI-compatible endpoint takes the model ID, not the Converse
// cross-region inference profile prefix (`us.`).
const model = process.env.DSH_MODEL ?? 'openai.gpt-5.6-luna';

const PLUGIN_ALLOWLIST = [
  '@deepseek-ai/dsh-sdk-jsonrpc-server',
  '@deepseek-ai/dsh-llm-pi-ai',
  '@deepseek-ai/dsh-agent-spine-demo',
];

const JOURNEY_STAGES = 'idea|problem|customer|evidence|opportunity|offer|validation_next_step';
const RECORD_SECTIONS =
  'idea_founder_context|problem|beachhead_customer|current_alternatives|' +
  'evidence_and_learning|assumptions_and_questions|opportunity_and_differentiation|' +
  'value_proposition|offer_pricing_model|economics_and_constraints|' +
  'decisions_and_changes|next_validation_experiment';

const SYSTEM_PROMPT = `You are the application-controlled BusinessGenerator co-founder,
an agentic assistant with the same read access to this venture as the founder and the
ability to update the business record and journey through founder-reviewable proposals.
Return exactly one JSON object and no markdown or prose outside it.
Use only the provided bounded context and capability results. Never invent facts,
customers, quotes, citations, consent, or validation, and never do research the founder
did not ask for or supply material toward. Never claim an accepted record write, stage
change, or external side effect — you always act through reviewable drafts.

CONVERSATION:
- The founder's latest request is the primary task. Use recentMessages only to maintain
  continuity; do not restate an earlier answer, the stage, or the whole business record
  unless it directly answers the new request or the founder asks for a recap.
- Prior co-founder messages may include interactionType, recommendation, and proposalId.
  Treat those as conversational context: build on unresolved questions, distinguish a
  proposed recommendation from an accepted decision, and avoid asking answered questions.
- A greeting, acknowledgement, or simple question deserves a natural, concise reply —
  not a venture-status report. Ask one focused follow-up only when information is needed
  to make progress.
- Answer questions directly before offering a next step. State the specific current
  context only when it changes the answer. Do not repeat generic phrases such as
  "the record is unchanged" unless that is material to the founder's request.
- Treat an explicit founder request to research, calculate, inspect current data, or
  prepare a draft as work to perform now: call the relevant capability, use its result,
  and report what you completed. Do not merely describe a future task you can perform
  in this turn.
- Use evidence.searchWeb@1 only when the founder explicitly asks for external research
  or clearly authorizes it. Use evidence.searchApproved@1 to inspect the venture's
  supplied material. Use venture.readCurrentState@1 only when the supplied context is
  insufficient or may have changed during the turn.

UI AND WORK RESULTS:
- interactionType selects the response UI: ask for one information request, inform for
  an answer, recommend for a founder decision, generate for a prepared artifact, review
  for something ready to inspect, and change for a reviewable record update.
- Create proposalDraft when the founder asks to change accepted business state. It renders
  a review control; never claim the change is accepted before the founder reviews it.
- Use suggestedSteps only when proposing a concrete next journey activity. Do not create
  a step merely because a stage exists.
- references render navigation controls. Include at most two references and only when
  opening that exact record, evidence, proposal, decision, or step helps the founder act.
  Do not add references just to cite state already explained in the response.

If you need a listed capability, return only:
{"tool":"evidence.searchApproved@1"|"evidence.searchWeb@1"|"evidence.createDraft@1"|"venture.readCurrentState@1"|"business.calculate@1"|"material.prepareDraft@1"|"proposal.createDraft@1","input":{}}
- evidence.searchApproved@1 input: {"query":"...","scope":"match"|"intake"}. Use scope
  "intake" to read the founder's own uploaded/pasted setup material.
- evidence.searchWeb@1 input: {"query":"..."}. Use only when the founder's own material
  does not answer the question and external research would help; it returns raw
  external search hits (title, url, excerpt), never a citation by itself.
- venture.readCurrentState@1 input: {}. Returns the same picture the founder sees: every
  record section's status and summary, readiness signals, journey steps, pending
  proposals, and recent decisions. Use it to refresh state mid-turn or before acting on
  something the founder just changed.
- business.calculate@1 input: {"operation":"add"|"sub"|"mul"|"div","left":"...",
  "right":"...","unit":"optional"}. Use it for arithmetic rather than estimating.
- material.prepareDraft@1 input: {"kind":"interview_guide"|"survey"|"experiment_draft"|"note",
  "summary":"..."}. Use it to prepare a requested working artifact from founder-supplied
  context; report the resulting draft for founder review.
- evidence.createDraft@1 input: {"summary":"...","url":"optional","excerpt":"optional"}.
  Use it to save founder-supplied or explicitly requested external material as a draft;
  never present it as accepted evidence.
- proposal.createDraft@1 is normally used by the application after proposalDraft is
  returned. Do not call it directly unless a tool result specifically requires it.

Otherwise return the final JSON:
{
  "explanation": "founder-readable text",
  "interactionType": "ask|inform|recommend|generate|review|change",
  "references": [{"kind":"record|step|proposal|evidence|decision","id":"existing id"}],
  "facts": [{"statement":"...", "references":[{"kind":"...","id":"..."}]}],
  "interpretation": "reasoned conclusion, not a stored fact",
  "assumptions": ["optional"],
  "recommendation": "optional next founder action",
  "uncertainty": "what remains uncertain",
  "blockedConditions": ["optional blocker"],
  "activity": "safe summary of work",
  "proposalDraft": {
    "rationale": "why",
    "uncertainty": "optional",
    "changes": [{
      "section": "${RECORD_SECTIONS}",
      "afterPayload":{"summary":"..."},
      "evidenceRefs":["content-block or evidence id returned by a capability"]
    }]
  },
  "suggestedSteps": [{
    "stage": "${JOURNEY_STAGES}",
    "objective": "what the founder would do in this stage",
    "whyNow": "why this stage is already supported by what the founder gave you"
  }],
  "artifact": {
    "title": "founder-readable title",
    "kind": "survey|interview_guide|experiment_draft|note",
    "content": "complete Markdown draft"
  }
}

proposalDraft.changes may include multiple entries across different sections in one
proposal — do not artificially limit yourself to a single section when the founder's
own material clearly supports several. Only include a change for a section you can
support with an evidenceRefs id from context or a capability result.

suggestedSteps lets you decide, from the founder's idea and setup material alone, how
much of the seven-stage journey (${JOURNEY_STAGES}) their input already covers. It can
be empty (their idea is exactly one step: capture the idea) or cover several stages if
their narrative or documents already answer those stages' questions. Never suggest a
stage you cannot support with cited founder material — do not do independent research
to fill stages in. The founder decides whether to activate any suggested step; you are
only recommending.

When the founder asks you to prepare a survey, interview guide, experiment draft, or
note, first call material.prepareDraft@1. Then include artifact with the complete draft
that the founder can copy or revise. A survey artifact must be usable as written: include
a short neutral introduction, numbered questions, the expected response format or answer
options for each question, and a closing question. Do not replace the draft with a
description of what a survey could contain. Your entire reply, including artifact.content,
must fit within one response — keep a survey to at most 8-10 focused questions (fewer,
tighter wording over exhaustive coverage) unless the founder explicitly asks for more, and
keep other artifact kinds similarly concise. Never let the artifact run so long that the
closing JSON braces would not fit in the response.

For an intake review, first call evidence.searchApproved@1 with
{"query":"founder intake","scope":"intake"} to read exactly what the founder supplied.
Then propose changes and suggestedSteps bounded to what that material clearly supports,
citing the returned ids in evidenceRefs. Omit proposalDraft and suggestedSteps entirely
if nothing is clearly supported yet. Omit proposalDraft unless the founder explicitly
asks for a material record change or asks you to review venture intake or setup
material. Every fact must cite an id from context or a capability result.`;

function requireEnv(name) {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`${name} is required`);
  }
  return value;
}

function send(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function turnFailureReason(events) {
  if (!Array.isArray(events)) {
    return undefined;
  }
  const turnEnd = events.find((event) => event.type === 'turn/end');
  return turnEnd?.data?.reason?.kind === 'error' ? turnEnd.data.reason.error?.message : undefined;
}

// Deliberately omits event/message content: events carry the founder's raw
// request and business context, which must not land in adapter stdout logs.
function logModelOutputIssue(operationId, error, rawText, resultKeys, events) {
  const preview =
    typeof rawText === 'string' ? `len=${String(rawText.length)}` : `type=${typeof rawText}`;
  const failureReason = turnFailureReason(events);
  process.stderr.write(
    `[harness] operationId=${operationId} model output rejected (${error.message}); ` +
      `resultKeys=${JSON.stringify(resultKeys ?? [])}; finalResponse=${preview}` +
      (failureReason === undefined ? '' : `; providerError=${failureReason}`) +
      '\n',
  );
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
    if (chunks.reduce((size, item) => size + item.length, 0) > 1_000_000) {
      throw new Error('request_too_large');
    }
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function authorized(request) {
  return request.headers.authorization === `Bearer ${token}`;
}

function parseJsonObjects(value, limit = 128) {
  const text = value
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/i, '');
  const objects = [];

  for (let start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let end = start; end < text.length; end += 1) {
      const char = text[end];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }
      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          try {
            const parsed = JSON.parse(text.slice(start, end + 1));
            if (typeof parsed === 'object' && parsed !== null) {
              objects.push(parsed);
              if (objects.length >= limit) {
                return objects;
              }
            }
          } catch {
            // Continue scanning for the next complete object.
          }
          break;
        }
      }
    }
  }
  return objects;
}

function invalidResultError(reasons) {
  return new Error(`invalid_harness_result: ${reasons.join(',')}`);
}

const INTERACTION_TYPES = new Set(['ask', 'inform', 'recommend', 'generate', 'review', 'change']);

function firstNonEmptyString(values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function normalizeModelPayload(parsed) {
  if (typeof parsed !== 'object' || parsed === null) {
    return parsed;
  }
  const candidates = [parsed];
  if (typeof parsed.result === 'object' && parsed.result !== null) {
    candidates.push(parsed.result);
  }
  if (typeof parsed.response === 'object' && parsed.response !== null) {
    candidates.push(parsed.response);
  }
  if (typeof parsed.output === 'object' && parsed.output !== null) {
    candidates.push(parsed.output);
  }
  if (typeof parsed.data === 'object' && parsed.data !== null) {
    candidates.push(parsed.data);
    if (typeof parsed.data.result === 'object' && parsed.data.result !== null) {
      candidates.push(parsed.data.result);
    }
  }
  return (
    candidates.find(
      (candidate) =>
        typeof candidate.tool === 'string' ||
        typeof candidate.explanation === 'string' ||
        typeof candidate.interactionType === 'string' ||
        typeof candidate.interaction_type === 'string' ||
        typeof candidate.message === 'string' ||
        typeof candidate.answer === 'string' ||
        (typeof candidate.artifact === 'object' && candidate.artifact !== null),
    ) ?? parsed
  );
}

function asStringArray(value, field) {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw invalidResultError([`${field}_must_be_string_array`]);
  }
  return value;
}

function parseModelOutput(value) {
  const objectCandidates = parseJsonObjects(value);
  if (objectCandidates.length === 0 && value.trim().startsWith('{')) {
    // The reply looks like JSON but no balanced top-level object was found — the
    // response was almost certainly cut off before completion (e.g. an artifact
    // longer than the output token budget). Never fall back to treating this raw,
    // unclosed JSON as founder-facing prose.
    throw invalidResultError(['likely_truncated_json']);
  }
  const normalizedCandidates = objectCandidates.map((candidate) =>
    normalizeModelPayload(candidate),
  );
  const toolCandidate = normalizedCandidates.find(
    (candidate) => typeof candidate.tool === 'string',
  );
  if (toolCandidate !== undefined) {
    return { kind: 'tool', name: toolCandidate.tool, input: toolCandidate.input ?? {} };
  }
  const parsed =
    normalizedCandidates.find((candidate) => {
      const artifact =
        typeof candidate.artifact === 'object' && candidate.artifact !== null
          ? candidate.artifact
          : undefined;
      return (
        firstNonEmptyString([
          candidate.explanation,
          candidate.message,
          candidate.answer,
          candidate.responseText,
        ]) !== undefined ||
        firstNonEmptyString([
          candidate.interactionType,
          candidate.interaction_type,
          candidate.type,
        ]) !== undefined ||
        (typeof artifact?.content === 'string' && artifact.content.trim() !== '')
      );
    }) ?? {};
  const artifact =
    typeof parsed.artifact === 'object' && parsed.artifact !== null ? parsed.artifact : undefined;
  const hasArtifactContent =
    typeof artifact?.content === 'string' && artifact.content.trim() !== '';
  const explanation =
    firstNonEmptyString([parsed.explanation, parsed.message, parsed.answer, parsed.responseText]) ??
    (hasArtifactContent
      ? 'Prepared the requested draft artifact for founder review.'
      : firstNonEmptyString([value.trim()]));
  const interactionTypeRaw = firstNonEmptyString([
    parsed.interactionType,
    parsed.interaction_type,
    parsed.type,
  ]);
  const interactionType = INTERACTION_TYPES.has(interactionTypeRaw ?? '')
    ? interactionTypeRaw
    : hasArtifactContent
      ? 'generate'
      : 'inform';
  const errors = [];
  if (explanation === undefined) {
    errors.push('explanation_required');
  }
  if (!INTERACTION_TYPES.has(interactionType)) {
    errors.push('interactionType_required');
  }
  if (errors.length > 0) {
    throw invalidResultError(errors);
  }

  const references = parsed.references === undefined ? [] : parsed.references;
  if (!Array.isArray(references)) {
    throw invalidResultError(['references_must_be_array']);
  }
  const facts = parsed.facts === undefined ? [] : parsed.facts;
  if (!Array.isArray(facts)) {
    throw invalidResultError(['facts_must_be_array']);
  }
  const uncertainty = parsed.uncertainty === undefined ? '' : parsed.uncertainty;
  if (typeof uncertainty !== 'string') {
    throw invalidResultError(['uncertainty_must_be_string']);
  }
  const activity =
    parsed.activity === undefined ? 'Responded to the founder request.' : parsed.activity;
  if (typeof activity !== 'string' || activity.trim() === '') {
    throw invalidResultError(['activity_must_be_nonempty_string']);
  }

  return {
    kind: 'final',
    result: {
      ...parsed,
      explanation,
      interactionType,
      references,
      facts,
      interpretation: typeof parsed.interpretation === 'string' ? parsed.interpretation : '',
      assumptions: asStringArray(parsed.assumptions, 'assumptions'),
      uncertainty,
      blockedConditions: asStringArray(parsed.blockedConditions, 'blockedConditions'),
      activity,
    },
  };
}

async function invokeCapability(input, name, toolInput) {
  if (
    typeof input.capabilityInvokeUrl !== 'string' ||
    typeof input.capabilityToken !== 'string' ||
    typeof input.contextPacket?.actor?.workspaceId !== 'string'
  ) {
    return { ok: false, summary: 'Tools are unavailable for this turn.', data: {} };
  }
  let response;
  try {
    response = await fetch(input.capabilityInvokeUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${input.capabilityToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name,
        input: toolInput,
        operationId: input.operationId,
        workspaceId: input.contextPacket.actor.workspaceId,
      }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return {
      ok: false,
      summary: 'The requested app tool could not be reached. No work was completed.',
      data: {},
    };
  }
  const payload = await response.json().catch(() => ({}));
  return payload;
}

function boundedEnvironment(scratch) {
  return {
    PATH: process.env.PATH ?? '',
    HOME: scratch,
    LANG: 'C.UTF-8',
    NODE_ENV: 'production',
    AWS_REGION: requireEnv('AWS_REGION'),
    AWS_BEARER_TOKEN_BEDROCK: requireEnv('AWS_BEARER_TOKEN_BEDROCK'),
    BEDROCK_MANTLE_BASE_URL:
      process.env.BEDROCK_MANTLE_BASE_URL ??
      `https://bedrock-mantle.${requireEnv('AWS_REGION')}.api.aws/openai/v1`,
    DSH_MODEL: model,
    DSH_CONTEXT_WINDOW: process.env.DSH_CONTEXT_WINDOW ?? '128000',
    DSH_CORDIS_CONFIG: configPath,
    DSH_SYSTEM_PROMPT: SYSTEM_PROMPT,
  };
}

async function runTurn(input) {
  if (
    typeof input !== 'object' ||
    input === null ||
    typeof input.operationId !== 'string' ||
    typeof input.founderRequest !== 'string' ||
    typeof input.timeoutMs !== 'number' ||
    typeof input.contextPacket !== 'object' ||
    input.contextPacket === null
  ) {
    throw new Error('invalid_run_request');
  }

  const scratch = await mkdtemp(join(tmpdir(), 'foundry-harness-'));
  let harness;
  try {
    const { DeepSeekHarness } = await import(sdkPath);
    harness = new DeepSeekHarness({
      launch: {
        command: process.execPath,
        args: [jsonrpcAgentPath, configPath],
        cwd: scratch,
        env: boundedEnvironment(scratch),
        requestTimeoutMs: input.timeoutMs,
        shutdownTimeoutMs: 1_000,
        disposeEofGraceMs: 1_000,
        disposeGraceMs: 2_000,
      },
      cwd: scratch,
      provider: 'bedrock-mantle',
      model,
      maxTokens: Number(process.env.DSH_MAX_OUTPUT_TOKENS ?? '4000'),
    });
    const toolResults = [];
    let prompt = {
      operationId: input.operationId,
      founderRequest: input.founderRequest,
      context: input.contextPacket,
      allowedCapabilities: input.allowedCapabilities ?? [],
    };
    let complianceRetries = 0;
    for (let round = 0; round < 6; round += 1) {
      const result = await harness.run(JSON.stringify(prompt));
      let parsed;
      try {
        parsed = parseModelOutput(result.finalResponse);
      } catch (parseError) {
        let modelKeys = [];
        try {
          const candidate = parseJsonObjects(result.finalResponse, 1)[0];
          if (typeof candidate === 'object' && candidate !== null) {
            modelKeys = Object.keys(candidate);
          }
        } catch {
          // Ignore key extraction failures. The parse error will still be logged.
        }
        logModelOutputIssue(
          input.operationId,
          parseError,
          result.finalResponse,
          modelKeys,
          result.events,
        );
        if (complianceRetries >= 2) {
          throw parseError;
        }
        complianceRetries += 1;
        const likelyTruncated = parseError.message.includes('likely_truncated_json');
        prompt = {
          ...prompt,
          instruction: likelyTruncated
            ? 'Your previous reply was cut off before the JSON object was complete, most ' +
              'likely because the artifact was too long for one response. Return the SAME ' +
              'JSON object again with a noticeably shorter artifact.content (fewer or more ' +
              'concise questions/sections) so the entire object, including its closing ' +
              'braces, fits in the response. Return ONLY that JSON object, with no prose or ' +
              'markdown outside it.'
            : 'Your previous reply was not a single valid JSON object. Return ONLY the JSON ' +
              'object described in your instructions, with no prose or markdown outside it.',
        };
        continue;
      }
      if (parsed.kind === 'final') {
        return parsed.result;
      }
      const toolResult = await invokeCapability(input, parsed.name, parsed.input);
      toolResults.push({ name: parsed.name, result: toolResult });
      prompt = {
        ...prompt,
        toolResults,
        instruction:
          'Use the tool results. Return the final JSON, or another allowed tool request.',
      };
    }
    throw new Error('tool_loop_exhausted');
  } finally {
    await harness?.close().catch(() => undefined);
    await rm(scratch, { recursive: true, force: true });
  }
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/healthz') {
    send(response, 200, { ok: true, plugins: PLUGIN_ALLOWLIST });
    return;
  }
  if (request.method !== 'POST' || request.url !== '/v1/cofounder/run') {
    send(response, 404, { error: 'not_found' });
    return;
  }
  if (!authorized(request)) {
    send(response, 401, { error: 'unauthorized' });
    return;
  }
  let body;
  try {
    body = await readJson(request);
    send(response, 200, { result: await runTurn(body) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'harness_failed';
    process.stderr.write(
      `[harness] operationId=${body?.operationId ?? 'unknown'} turn failed: ${message}\n`,
    );
    send(response, 502, { error: 'harness_failed', category: message });
  }
});

server.listen(port, '0.0.0.0', () => {
  process.stderr.write(`DeepSeek Harness adapter listening on ${String(port)}\n`);
});
