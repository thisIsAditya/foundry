import { StreamEventSchema, type StreamEvent } from '@foundry/api-contracts';
import EventSource from 'react-native-sse';

import { apiBaseUrl } from './env';

export type ProjectStreamHandlers = {
  onEvent: (seq: number, event: StreamEvent) => void;
};

export function connectProjectStream(
  projectId: string,
  lastEventId: number | undefined,
  headers: Record<string, string>,
  handlers: ProjectStreamHandlers,
): { close: () => void } {
  const url = `${apiBaseUrl()}/api/stream/${projectId}`;
  const source = new EventSource(url, {
    headers: {
      ...headers,
      ...(lastEventId === undefined ? {} : { 'Last-Event-ID': String(lastEventId) }),
    },
  });
  source.addEventListener('message', (message) => {
    if (typeof message.data !== 'string') {
      return;
    }
    const seq = Number(message.lastEventId);
    const parsed = StreamEventSchema.safeParse(JSON.parse(message.data));
    if (!parsed.success || !Number.isFinite(seq)) {
      return;
    }
    handlers.onEvent(seq, parsed.data);
  });
  return {
    close() {
      source.close();
    },
  };
}
