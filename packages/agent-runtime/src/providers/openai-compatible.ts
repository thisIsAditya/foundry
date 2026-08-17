import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ProviderConnection } from '@foundry/domain';
import { AppError } from '@foundry/observability';

import { localCapabilities } from './capabilities.js';
import type { BuiltModel } from './resolve-key.js';
import type { SecretBox } from '../secrets/envelope.js';

export function openAICompatibleProvider(
  connection: ProviderConnection,
  modelId: string,
  box: SecretBox,
): BuiltModel {
  if (connection.endpointOrRegion === null || connection.endpointOrRegion.length === 0) {
    throw new AppError({
      code: 'invalid_input',
      explanation: 'An OpenAI-compatible connection requires an endpoint URL.',
      nextAction: 'Set endpointOrRegion to the local or private server base URL.',
    });
  }
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
