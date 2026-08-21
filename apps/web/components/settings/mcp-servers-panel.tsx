'use client';

import { AddMcpServerInputSchema } from '@foundry/api-contracts';
import type { McpTransport } from '@foundry/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import { useTRPC } from '../../lib/trpc/client';

const HEALTH_LABELS: Record<string, string> = {
  ok: 'Connected',
  unreachable: 'Unreachable',
  auth_failed: 'Auth failed',
  unknown: 'Not checked yet',
};

function healthBadgeClass(healthStatus: string): string {
  if (healthStatus === 'ok') {
    return 'badge badge-success';
  }
  if (healthStatus === 'unknown') {
    return 'badge';
  }
  return 'badge badge-warning';
}

export function McpServersPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const servers = useQuery(trpc.mcpServer.list.queryOptions());
  const idempotencyKey = useRef(crypto.randomUUID());
  const [name, setName] = useState('');
  const [transport, setTransport] = useState<McpTransport>('http');
  const [url, setUrl] = useState('');
  const [headerSecret, setHeaderSecret] = useState('');
  const [readOnly, setReadOnly] = useState(false);

  async function invalidate(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: trpc.mcpServer.list.queryKey() });
  }

  const add = useMutation(
    trpc.mcpServer.add.mutationOptions({
      onSuccess: async () => {
        idempotencyKey.current = crypto.randomUUID();
        setName('');
        setUrl('');
        setHeaderSecret('');
        setReadOnly(false);
        await invalidate();
      },
    }),
  );
  const remove = useMutation(trpc.mcpServer.remove.mutationOptions({ onSuccess: invalidate }));
  const toggle = useMutation(trpc.mcpServer.toggle.mutationOptions({ onSuccess: invalidate }));
  const setServerReadOnly = useMutation(
    trpc.mcpServer.setReadOnly.mutationOptions({ onSuccess: invalidate }),
  );
  const testConnection = useMutation(
    trpc.mcpServer.testConnection.mutationOptions({ onSuccess: invalidate }),
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedHeaderSecret = headerSecret.trim();
    const input = AddMcpServerInputSchema.parse({
      name: name.trim(),
      transport,
      url: url.trim(),
      ...(trimmedHeaderSecret.length === 0 ? {} : { headerSecret: trimmedHeaderSecret }),
      readOnly,
      idempotencyKey: idempotencyKey.current,
    });
    try {
      await add.mutateAsync(input);
    } catch {
      // Keep the same idempotency key so a retry is safe (02 §7).
    }
  }

  const items = servers.data ?? [];

  return (
    <div className="stack">
      <section className="card stack">
        <h2 className="card-title">MCP tools</h2>
        <p className="hint">
          Connect an MCP server — like a web search tool — so the co-founder agent can use it while
          running research jobs. This is tied to your account, so it applies everywhere you&apos;re
          the workspace owner, not just this project. Mark a server read-only to let the co-founder
          call it directly in chat, not just in background jobs.
        </p>
        <form className="stack" onSubmit={(event) => void onSubmit(event)}>
          <div className="row-form">
            <label className="field">
              <span>Name</span>
              <input
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Exa web search"
                required
              />
            </label>
            <label className="field">
              <span>Transport</span>
              <select
                className="input"
                value={transport}
                onChange={(event) => setTransport(event.target.value as McpTransport)}
              >
                <option value="http">HTTP (streamable)</option>
                <option value="sse">SSE</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>Server URL</span>
            <input
              className="input"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://mcp.exa.ai/mcp?exaApiKey=..."
              required
            />
          </label>
          <label className="field">
            <span>Authorization header (optional)</span>
            <input
              className="input"
              type="password"
              value={headerSecret}
              onChange={(event) => setHeaderSecret(event.target.value)}
              placeholder="Only needed if the key isn't already in the URL above"
            />
          </label>
          <label className="field-inline">
            <input
              type="checkbox"
              checked={readOnly}
              onChange={(event) => setReadOnly(event.target.checked)}
            />
            <span>
              Treat this server as read-only search (safe for live chat) — only enable this if every
              tool on this server just looks things up and never sends, pays, files, or changes
              anything.
            </span>
          </label>
          <div>
            <button className="btn" type="submit" disabled={add.isPending}>
              {add.isPending ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </form>
        {errorMessageOf(add.error) === null ? null : (
          <p className="alert">{errorMessageOf(add.error)}</p>
        )}
      </section>

      <section className="card stack">
        <h2 className="card-title">Connected servers</h2>
        {servers.isLoading ? <p className="muted">Loading…</p> : null}
        {servers.isError ? <p className="alert">{servers.error.message}</p> : null}
        {servers.isSuccess && items.length === 0 ? (
          <p className="hint">None connected yet.</p>
        ) : (
          <ul className="list">
            {items.map((item) => (
              <li key={item.id} className="list-row">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="hint">
                    {item.transport.toUpperCase()} · {item.lastToolCount ?? 0} tool
                    {item.lastToolCount === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={healthBadgeClass(item.healthStatus)}>
                    {HEALTH_LABELS[item.healthStatus] ?? item.healthStatus}
                  </span>
                  {item.readOnly ? (
                    <span className="badge badge-success">Read-only · usable in chat</span>
                  ) : null}
                  <button
                    type="button"
                    className="badge"
                    onClick={() =>
                      setServerReadOnly.mutate({
                        mcpServerId: item.id,
                        readOnly: !item.readOnly,
                        idempotencyKey: crypto.randomUUID(),
                      })
                    }
                    disabled={setServerReadOnly.isPending}
                  >
                    {item.readOnly ? 'Mark as side-effecting' : 'Mark read-only'}
                  </button>
                  <button
                    type="button"
                    className="badge"
                    onClick={() =>
                      toggle.mutate({
                        mcpServerId: item.id,
                        enabled: !item.enabled,
                        idempotencyKey: crypto.randomUUID(),
                      })
                    }
                    disabled={toggle.isPending}
                  >
                    {item.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    className="badge"
                    onClick={() =>
                      testConnection.mutate({
                        mcpServerId: item.id,
                        idempotencyKey: crypto.randomUUID(),
                      })
                    }
                    disabled={testConnection.isPending}
                  >
                    Test
                  </button>
                  <button
                    type="button"
                    className="badge"
                    onClick={() =>
                      remove.mutate({ mcpServerId: item.id, idempotencyKey: crypto.randomUUID() })
                    }
                    disabled={remove.isPending}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
