import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ProviderConnection } from '@foundry/domain';
import { AppError } from '@foundry/observability';

import { localCapabilities } from './capabilities.js';
import type { BuiltModel } from './resolve-key.js';
import { assertPublicHttpUrl } from '../mcp/ssrf.js';
import type { SecretBox } from '../secrets/envelope.js';

export async function openAICompatibleProvider(
  connection: ProviderConnection,
  modelId: string,
  box: SecretBox,
): Promise<BuiltModel> {
  if (connection.endpointOrRegion === null || connection.endpointOrRegion.length === 0) {
    throw new AppError({
      code: 'invalid_input',
      explanation: 'An OpenAI-compatible connection requires an endpoint URL.',
      nextAction: 'Set endpointOrRegion to the local or private server base URL.',
    });
  }
  // Ollama runs locally by default; every other OpenAI-compatible endpoint must resolve
  // to a public address so a workspace cannot use a model connection to probe internal hosts.
  await assertPublicHttpUrl(connection.endpointOrRegion, {
    allowLoopback: connection.providerFamily === 'ollama',
  });
  const apiKey =
    connection.credentialRefEncrypted === null
      ? 'not-needed'
      : box.decrypt(connection.credentialRefEncrypted);
  const provider = createOpenAICompatible({
    name: connection.providerFamily,
    baseURL: connection.endpointOrRegion,
    apiKey,
  });
  return { model: provider(modelId), capabilities: localCapabilities };
}
