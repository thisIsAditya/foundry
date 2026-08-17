'use client';

import { ConnectProviderInputSchema } from '@foundry/api-contracts';
import type { ProviderFamily } from '@foundry/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';

import { useTRPC } from '../../../../lib/trpc/client';

function errorMessageOf(error: unknown): string | null {
  return error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : null;
}

type ProviderPreset = 'ollama' | 'anthropic' | 'openai';

const PRESETS: Record<
  ProviderPreset,
  {
    label: string;
    family: ProviderFamily;
    authMode: 'none' | 'api_key';
    needsEndpoint: boolean;
    needsModelId: boolean;
    endpointPlaceholder?: string;
    modelPlaceholder: string;
  }
> = {
  ollama: {
    label: 'Ollama, running on this computer',
    family: 'ollama',
    authMode: 'none',
    needsEndpoint: true,
    needsModelId: true,
    endpointPlaceholder: 'http://localhost:11434/v1',
    modelPlaceholder: 'e.g. gemma3:4b — must already be pulled in Ollama',
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    family: 'anthropic',
    authMode: 'api_key',
    needsEndpoint: false,
    needsModelId: false,
    modelPlaceholder: 'Leave blank to use the default Claude model',
  },
  openai: {
    label: 'OpenAI',
    family: 'openai',
    authMode: 'api_key',
    needsEndpoint: false,
    needsModelId: false,
    modelPlaceholder: 'e.g. gpt-4o-mini — leave blank for the account default',
  },
};

/**
 * Nothing that talks to the AI works until a workspace has a healthy provider
 * connection. There is no separate "workspace settings" screen yet, so this
 * lives on the desk — the first place a founder hits the "no provider" error.
 */
export function ModelProviderPanel({ workspaceId }: { workspaceId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const connections = useQuery(trpc.provider.listConnections.queryOptions({ workspaceId }));
  const idempotencyKey = useRef(crypto.randomUUID());
  const [preset, setPreset] = useState<ProviderPreset>('ollama');
  const [endpoint, setEndpoint] = useState('http://localhost:11434/v1');
  const [modelId, setModelId] = useState('');
  const [credential, setCredential] = useState('');

  const connect = useMutation(
    trpc.provider.connect.mutationOptions({
      onSuccess: async () => {
        idempotencyKey.current = crypto.randomUUID();
        setCredential('');
        await queryClient.invalidateQueries({ queryKey: trpc.provider.listConnections.queryKey() });
      },
    }),
  );

  const config = PRESETS[preset];
  const items = connections.data ?? [];
  const healthy = items.find((item) => item.healthStatus === 'ok');

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const input = ConnectProviderInputSchema.parse({
      workspaceId,
      family: config.family,
      authMode: config.authMode,
      credential: config.authMode === 'api_key' ? credential.trim() : undefined,
      endpointOrRegion: config.needsEndpoint ? endpoint.trim() : undefined,
      modelId: modelId.trim().length > 0 ? modelId.trim() : undefined,
      idempotencyKey: idempotencyKey.current,
    });
    try {
      await connect.mutateAsync(input);
    } catch {
      // Keep the same idempotency key so a retry is safe (02 §7).
    }
  }

  if (connections.isLoading) {
    return null;
  }

  if (healthy !== undefined) {
    return (
      <div id="model" className="card-done flex items-center gap-3 scroll-mt-6">
        <span className="step-marker step-marker-done" aria-hidden="true">
          ✓
        </span>
        <div>
          <p className="card-title">A model is connected</p>
          <p className="hint">
            Your AI co-founder is running on <strong>{healthy.providerFamily}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section id="model" className="callout scroll-mt-6">
      <p className="callout-eyebrow">Setup needed</p>
      <p className="callout-title">Connect a model so your AI co-founder can think</p>
      <p className="text-sm text-text-muted">
        Nothing below generates until a model is connected. If Ollama is already running on this
        computer, this takes about 30 seconds — just tell us which model you&apos;ve pulled.
      </p>
      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        <label className="field">
          <span>Where should it run?</span>
          <select
            className="input"
            value={preset}
            onChange={(event) => setPreset(event.target.value as ProviderPreset)}
          >
            {Object.entries(PRESETS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </label>
        {config.needsEndpoint ? (
          <label className="field">
            <span>Server address</span>
            <input
              className="input"
              value={endpoint}
              onChange={(event) => setEndpoint(event.target.value)}
              placeholder={config.endpointPlaceholder}
              required
            />
          </label>
        ) : null}
        <label className="field">
          <span>Model name{config.needsModelId ? '' : ' (optional)'}</span>
          <input
            className="input"
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
            placeholder={config.modelPlaceholder}
            required={config.needsModelId}
          />
        </label>
        {config.authMode === 'api_key' ? (
          <label className="field">
            <span>API key</span>
            <input
              className="input"
              type="password"
              value={credential}
              onChange={(event) => setCredential(event.target.value)}
              required
            />
          </label>
        ) : null}
        <div>
          <button className="btn" type="submit" disabled={connect.isPending}>
            {connect.isPending ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      </form>
      {errorMessageOf(connect.error) === null ? null : (
        <p className="alert">{errorMessageOf(connect.error)}</p>
      )}
      {items.length > 0 ? (
        <p className="hint">
          {items.length} connection{items.length === 1 ? '' : 's'} saved, but none are healthy yet —
          double check the model name and try again.
        </p>
      ) : null}
    </section>
  );
}
