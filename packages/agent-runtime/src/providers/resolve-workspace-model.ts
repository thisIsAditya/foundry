import { limits } from '@foundry/config/limits';
import type { ProviderConnection } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import type { LanguageModel } from 'ai';

import type { SecretBox } from '../secrets/envelope.js';
import type { ProviderCapabilities, ProviderSecrets } from './capabilities.js';
import { buildModel } from './registry.js';

export type ResolvedWorkspaceModel = {
  model: LanguageModel;
  capabilities: ProviderCapabilities;
  connection: ProviderConnection;
  modelId: string;
};

/**
 * Picks the healthy provider connection for a workspace and builds a model from it.
 * Shared by the web diagnose path and the sprint worker (plan §Slice 2) so both
 * pick the same connection under the same rule: `healthStatus === 'ok'`, else first.
 */
export async function resolveWorkspaceModel(input: {
  connections: readonly ProviderConnection[];
  secrets: ProviderSecrets;
  secretBox: SecretBox;
}): Promise<ResolvedWorkspaceModel> {
  const connection =
    input.connections.find((item) => item.healthStatus === 'ok') ?? input.connections[0];
  if (connection === undefined) {
    throw new AppError({
      code: 'provider_unavailable',
      explanation: 'No model provider is connected for this workspace.',
      nextAction: 'Connect Anthropic (or another provider) in workspace settings.',
    });
  }
  const allowed = connection.allowedModels;
  const modelId =
    Array.isArray(allowed) && typeof allowed[0] === 'string'
      ? allowed[0]
      : limits.provider.defaultAnthropicModel;
  const built = await buildModel(connection, modelId, input.secrets, input.secretBox);
  return { model: built.model, capabilities: built.capabilities, connection, modelId };
}
