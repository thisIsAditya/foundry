import { createGateway } from '@ai-sdk/gateway';
import type { ProviderConnection } from '@foundry/domain';

import { gatewayCapabilities, type ProviderSecrets } from './capabilities.js';
import { resolveApiKey, type BuiltModel } from './resolve-key.js';
import type { SecretBox } from '../secrets/envelope.js';

export function gatewayProvider(
  connection: ProviderConnection,
  modelId: string,
  secrets: ProviderSecrets,
  box: SecretBox,
): BuiltModel {
  const apiKey = resolveApiKey(connection, secrets, box, 'ai_gateway');
  const provider = createGateway({ apiKey });
  return { model: provider(modelId), capabilities: gatewayCapabilities };
}
