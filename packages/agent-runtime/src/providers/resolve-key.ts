import type { ProviderConnection } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import type { LanguageModel } from 'ai';

import type { ProviderCapabilities, ProviderSecrets } from './capabilities.js';
import type { SecretBox } from '../secrets/envelope.js';

export function resolveApiKey(
  connection: ProviderConnection,
  secrets: ProviderSecrets,
  box: SecretBox,
  family: 'anthropic' | 'openai' | 'ai_gateway',
): string {
  if (connection.authMode === 'platform_env') {
    const key =
      family === 'anthropic'
        ? secrets.anthropicApiKey
        : family === 'openai'
          ? secrets.openaiApiKey
          : secrets.gatewayApiKey;
    if (key === undefined || key.length === 0) {
      throw new AppError({
        code: 'provider_unavailable',
        explanation: `No managed ${family} credential is configured.`,
        nextAction: 'Connect a BYOK key or set the platform provider secret.',
      });
    }
    return key;
  }
  if (connection.authMode === 'api_key') {
    if (connection.credentialRefEncrypted === null) {
      throw new AppError({
        code: 'provider_unavailable',
        explanation: 'This connection has no stored credential.',
        nextAction: 'Reconnect the provider with a valid API key.',
      });
    }
    return box.decrypt(connection.credentialRefEncrypted);
  }
  throw new AppError({
    code: 'capability_unsupported',
    explanation: `Auth mode ${connection.authMode} cannot supply an API key for ${family}.`,
    nextAction: 'Use api_key or platform_env for this provider family.',
  });
}

export type BuiltModel = {
  model: LanguageModel;
  capabilities: ProviderCapabilities;
};
