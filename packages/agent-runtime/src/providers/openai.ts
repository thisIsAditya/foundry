import { createOpenAI } from '@ai-sdk/openai';
import type { ProviderConnection } from '@foundry/domain';

import { openaiCapabilities, type ProviderSecrets } from './capabilities.js';
import { resolveApiKey, type BuiltModel } from './resolve-key.js';
import type { SecretBox } from '../secrets/envelope.js';

export function openaiProvider(
  connection: ProviderConnection,
  modelId: string,
  secrets: ProviderSecrets,
  box: SecretBox,
): BuiltModel {
  const apiKey = resolveApiKey(connection, secrets, box, 'openai');
  const provider = createOpenAI({ apiKey });
  return { model: provider(modelId), capabilities: openaiCapabilities };
}
