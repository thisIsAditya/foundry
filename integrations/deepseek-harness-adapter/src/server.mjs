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

const SYSTEM_PROMPT = `You are the application-controlled BusinessGenerator co-founder.
Return exactly one JSON object and no markdown or prose outside it.
Use only the provided bounded context. Do not claim validation, external action,
record acceptance, stage progression, or access to tools. Never invent facts.
The JSON must match:
{
  "explanation": "founder-readable text",
  "interactionType": "ask|inform|recommend|generate|review|change",
  "references": [{"kind":"record|step|proposal|evidence|decision","id":"existing id"}],
  "uncertainty": "what remains uncertain",
  "blockedConditions": ["optional blocker"],
  "activity": "safe summary of work",
  "proposalDraft": {
    "rationale": "why",
    "uncertainty": "optional",
    "changes": [{"section":"one supplied record section","afterPayload":{"summary":"..."}}]
  }
}
Omit proposalDraft unless the founder explicitly asks for a material record change.`;

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

function parseResult(value) {
  const text = value
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/i, '');
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace < firstBrace) {
    throw new Error('missing_structured_result');
  }
  const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof parsed.explanation !== 'string' ||
    typeof parsed.interactionType !== 'string' ||
    !Array.isArray(parsed.references) ||
    typeof parsed.uncertainty !== 'string' ||
    !Array.isArray(parsed.blockedConditions) ||
    typeof parsed.activity !== 'string'
  ) {
    throw new Error('invalid_harness_result');
  }
  return parsed;
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
      maxTokens: Number(process.env.DSH_MAX_OUTPUT_TOKENS ?? '1800'),
    });
    const result = await harness.run(
      JSON.stringify({
        operationId: input.operationId,
        founderRequest: input.founderRequest,
        context: input.contextPacket,
      }),
    );
    return parseResult(result.finalResponse);
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
  try {
    send(response, 200, { result: await runTurn(await readJson(request)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'harness_failed';
    send(response, 502, { error: 'harness_failed', category: message });
  }
});

server.listen(port, '0.0.0.0', () => {
  process.stderr.write(`DeepSeek Harness adapter listening on ${String(port)}\n`);
});
