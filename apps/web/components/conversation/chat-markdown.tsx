'use client';

import { Streamdown } from 'streamdown';

/**
 * The co-founder's answers arrive fully formed (one `generateObject` call,
 * not a token stream), so this always renders in "static" mode — no
 * incomplete-markdown handling or animation needed.
 */
export function ChatMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <Streamdown
      mode="static"
      controls={{ code: { copy: true, download: false }, table: false, mermaid: false }}
      className={className === undefined ? 'chat-markdown' : `chat-markdown ${className}`}
    >
      {text}
    </Streamdown>
  );
}
