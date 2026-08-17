import { createAnthropic } from '@ai-sdk/anthropic';
import type { ProviderConnection } from '@foundry/domain';

import { anthropicCapabilities } from './capabilities.js';
import { resolveApiKey, type BuiltModel } from './resolve-key.js';
import type { ProviderSecrets } from './capabilities.js';
import type { SecretBox } from '../secrets/envelope.js';

export function anthropicProvider(
  connection: ProviderConnection,
  modelId: string,
  secrets: ProviderSecrets,
  box: SecretBox,
): BuiltModel {
  const apiKey = resolveApiKey(connection, secrets, box, 'anthropic');
  const provider = createAnthropic({ apiKey });
  return { model: provider(modelId), capabilities: anthropicCapabilities };
}
