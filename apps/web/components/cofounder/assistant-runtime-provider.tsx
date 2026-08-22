'use client';

import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
} from '@assistant-ui/react';
import type { ConversationMessage } from '@foundry/domain';
import type { ReactNode } from 'react';

import { toExternalThreadMessage } from '../../lib/cofounder-external-store';

function textOf(message: AppendMessage): string | null {
  const part = message.content.find((item) => item.type === 'text');
  return part !== undefined && part.type === 'text' ? part.text : null;
}

export function CofounderAssistantRuntimeProvider({
  messages,
  isRunning,
  onSubmit,
  onCancel,
  children,
}: {
  messages: readonly ConversationMessage[];
  isRunning: boolean;
  onSubmit: (text: string) => Promise<void>;
  onCancel: () => Promise<void>;
  children: ReactNode;
}) {
  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    convertMessage: toExternalThreadMessage,
    onNew: async (message) => {
      const text = textOf(message);
      if (text === null || text.trim().length === 0) {
        return;
      }
      await onSubmit(text);
    },
    onCancel,
  });

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
