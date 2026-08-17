import type { ProviderConnection } from '@foundry/domain';
import { AppError } from '@foundry/observability';

import { anthropicProvider } from './anthropic.js';
import type { ProviderSecrets } from './capabilities.js';
import { bedrockProvider } from './bedrock.js';
import { gatewayProvider } from './gateway.js';
import { openaiProvider } from './openai.js';
import { openAICompatibleProvider } from './openai-compatible.js';
import type { BuiltModel } from './resolve-key.js';
import type { SecretBox } from '../secrets/envelope.js';

export async function buildModel(
  connection: ProviderConnection,
  modelId: string,
  secrets: ProviderSecrets,
  box: SecretBox,
): Promise<BuiltModel> {
  switch (connection.providerFamily) {
    case 'anthropic':
      return anthropicProvider(connection, modelId, secrets, box);
    case 'openai':
      return openaiProvider(connection, modelId, secrets, box);
    case 'bedrock':
      return bedrockProvider(connection, modelId);
    case 'ai_gateway':
      return gatewayProvider(connection, modelId, secrets, box);
    case 'openai_compatible':
    case 'ollama':
      return await openAICompatibleProvider(connection, modelId, box);
    default: {
      const family: never = connection.providerFamily;
      throw new AppError({
        code: 'capability_unsupported',
        explanation: `Unsupported provider family: ${String(family)}`,
        nextAction: 'Choose a supported connection family.',
      });
    }
  }
}
