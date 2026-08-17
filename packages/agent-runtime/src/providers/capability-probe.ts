import { limits } from '@foundry/config/limits';
import type { ProviderConnection } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { generateText } from 'ai';

import type { ProviderCapabilities, ProviderSecrets } from './capabilities.js';
import { buildModel } from './registry.js';
import type { SecretBox } from '../secrets/envelope.js';

export async function probeProviderCapabilities(
  connection: ProviderConnection,
  modelId: string,
  secrets: ProviderSecrets,
  box: SecretBox,
): Promise<ProviderCapabilities> {
  const built = await buildModel(connection, modelId, secrets, box);
  try {
    const timeoutMs =
      connection.providerFamily === 'ollama' ? 60_000 : limits.provider.capabilityProbeTimeoutMs;
    const result = await generateText({
      model: built.model,
      prompt: 'Reply with the single word pong.',
      abortSignal: AbortSignal.timeout(timeoutMs),
    });
    if (result.text.trim().length === 0) {
      throw new AppError({
        code: 'provider_unavailable',
        explanation: 'The provider probe returned no text.',
        nextAction: 'Check the credential and retry the connection.',
        retryable: true,
      });
    }
    return built.capabilities;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError({
      code: 'provider_unavailable',
      explanation: 'The provider capability probe failed.',
      nextAction: 'Check the credential, endpoint, and network, then retry.',
      retryable: true,
      cause: error,
    });
  }
}
