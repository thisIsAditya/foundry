import { ProviderConnectionIdSchema } from '@foundry/domain';
import type { ProviderConnection } from '@foundry/domain';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { openAICompatibleProvider } from './openai-compatible.js';
import type { SecretBox } from '../secrets/envelope.js';

const box: SecretBox = {
  encrypt: (value) => value,
  decrypt: (value) => value,
};

function connection(overrides: Partial<ProviderConnection>): ProviderConnection {
  return {
    id: ProviderConnectionIdSchema.parse(randomUUID()),
    workspaceId: null,
    userId: null,
    providerFamily: 'openai_compatible',
    authMode: 'api_key',
    credentialRefEncrypted: null,
    endpointOrRegion: null,
    allowedModels: null,
    allowedDataClassifications: null,
    fallbackPolicy: null,
    spendLimitUsd: null,
    healthStatus: 'ok',
    lastValidatedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('openAICompatibleProvider SSRF guard', () => {
  it('rejects a remote openai-compatible endpoint that resolves to a private address', async () => {
    await expect(
      openAICompatibleProvider(
        connection({
          providerFamily: 'openai_compatible',
          endpointOrRegion: 'http://10.0.0.5:8080/v1',
        }),
        'some-model',
        box,
      ),
    ).rejects.toMatchObject({ code: 'policy_forbidden' });
  });

  it('allows an ollama connection on loopback', async () => {
    const built = await openAICompatibleProvider(
      connection({ providerFamily: 'ollama', endpointOrRegion: 'http://127.0.0.1:11434/v1' }),
      'gemma3:4b',
      box,
    );
    expect(built.model).toBeDefined();
  });

  it('rejects an openai-compatible connection on loopback (not ollama)', async () => {
    await expect(
      openAICompatibleProvider(
        connection({
          providerFamily: 'openai_compatible',
          endpointOrRegion: 'http://127.0.0.1:8080/v1',
        }),
        'some-model',
        box,
      ),
    ).rejects.toMatchObject({ code: 'policy_forbidden' });
  });
});
