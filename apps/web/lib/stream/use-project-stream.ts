'use client';

import { StreamEventSchema, type StreamEvent } from '@foundry/api-contracts';
import { useEffect, useMemo } from 'react';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

type ProjectStreamState = {
  events: StreamEvent[];
  lastSeq: number;
  transcript: string;
  append: (seq: number, event: StreamEvent) => void;
};

type ProjectStreamStore = UseBoundStore<StoreApi<ProjectStreamState>>;

const stores = new Map<string, ProjectStreamStore>();

function createProjectStreamStore(): ProjectStreamStore {
  return create<ProjectStreamState>((set) => ({
    events: [],
    lastSeq: 0,
    transcript: '',
    append: (seq, event) =>
      set((state) => {
        if (seq <= state.lastSeq) {
          return state;
        }
        return {
          events: [...state.events, event],
          lastSeq: seq,
          transcript:
            event.type === 'text_delta' ? `${state.transcript}${event.delta}` : state.transcript,
        };
      }),
  }));
}

function storeFor(projectId: string): ProjectStreamStore {
  const existing = stores.get(projectId);
  if (existing !== undefined) {
    return existing;
  }
  const created = createProjectStreamStore();
  stores.set(projectId, created);
  return created;
}

export function useProjectStream(projectId: string): ProjectStreamState {
  const store = useMemo(() => storeFor(projectId), [projectId]);
  const events = store((state) => state.events);
  const lastSeq = store((state) => state.lastSeq);
  const transcript = store((state) => state.transcript);
  const append = store((state) => state.append);

  useEffect(() => {
    const source = new EventSource(`/api/stream/${projectId}`);
    source.onmessage = (message) => {
      const seq = Number(message.lastEventId);
      if (!Number.isFinite(seq)) {
        return;
      }
      let payload: unknown;
      try {
        payload = JSON.parse(message.data) as unknown;
      } catch {
        return;
      }
      const parsed = StreamEventSchema.safeParse(payload);
      if (parsed.success) {
        append(seq, parsed.data);
      }
    };
    return () => {
      source.close();
    };
  }, [append, projectId]);

  return { events, lastSeq, transcript, append };
}
