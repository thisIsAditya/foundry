'use client';

import {
  StreamEventSchema,
  type ConversationEffort,
  type StreamEvent,
} from '@foundry/api-contracts';
import { useEffect, useMemo } from 'react';
import { create, type StoreApi, type UseBoundStore } from 'zustand';

type ProjectStreamState = {
  events: StreamEvent[];
  lastSeq: number;
  transcript: string;
  unreadCount: number;
  effort: ConversationEffort;
  setEffort: (effort: ConversationEffort) => void;
  markRead: () => void;
  append: (seq: number, event: StreamEvent) => void;
};

type ProjectStreamStore = UseBoundStore<StoreApi<ProjectStreamState>>;

const stores = new Map<string, ProjectStreamStore>();
const sources = new Map<string, { source: EventSource; refs: number }>();

function createProjectStreamStore(): ProjectStreamStore {
  return create<ProjectStreamState>((set) => ({
    events: [],
    lastSeq: 0,
    transcript: '',
    unreadCount: 0,
    effort: 'standard',
    setEffort: (effort) => set({ effort }),
    markRead: () => set({ unreadCount: 0 }),
    append: (seq, event) =>
      set((state) => {
        if (seq <= state.lastSeq) {
          return state;
        }
        return {
          events: [...state.events, event],
          lastSeq: seq,
          unreadCount:
            event.type === 'conversation_message_appended' && event.actor === 'co_founder'
              ? state.unreadCount + 1
              : state.unreadCount,
          // Cleared on completion too: the final answer lands in conversation
          // history right after, so this scratch pad must not linger and
          // render as a second, unlabeled copy of the same text.
          transcript:
            event.type === 'message_started' || event.type === 'message_completed'
              ? ''
              : event.type === 'text_delta'
                ? `${state.transcript}${event.delta}`
                : state.transcript,
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

function retainSource(projectId: string, store: ProjectStreamStore): void {
  const existing = sources.get(projectId);
  if (existing !== undefined) {
    existing.refs += 1;
    return;
  }
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
      store.getState().append(seq, parsed.data);
    }
  };
  sources.set(projectId, { source, refs: 1 });
}

function releaseSource(projectId: string): void {
  const existing = sources.get(projectId);
  if (existing === undefined) {
    return;
  }
  existing.refs -= 1;
  if (existing.refs > 0) {
    return;
  }
  existing.source.close();
  sources.delete(projectId);
}

export function useProjectStream(projectId: string): ProjectStreamState {
  const store = useMemo(() => storeFor(projectId), [projectId]);
  const events = store((state) => state.events);
  const lastSeq = store((state) => state.lastSeq);
  const transcript = store((state) => state.transcript);
  const unreadCount = store((state) => state.unreadCount);
  const effort = store((state) => state.effort);
  const setEffort = store((state) => state.setEffort);
  const markRead = store((state) => state.markRead);
  const append = store((state) => state.append);

  useEffect(() => {
    retainSource(projectId, store);
    return () => {
      releaseSource(projectId);
    };
  }, [projectId, store]);

  return { events, lastSeq, transcript, unreadCount, effort, setEffort, markRead, append };
}
