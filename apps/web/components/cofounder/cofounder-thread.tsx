'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import { ConversationMessageView } from '../conversation/conversation-message-view';
import { CofounderAssistantRuntimeProvider } from './assistant-runtime-provider';
import { CofounderComposer } from './cofounder-composer';
import { CofounderOperationStatus } from './cofounder-operation-status';
import { useCofounderTransport } from './use-cofounder-transport';

const SCROLL_BOTTOM_THRESHOLD_PX = 96;

export function CofounderThread({ projectId }: { projectId: string }) {
  const transport = useCofounderTransport(projectId);
  const scroller = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  useEffect(() => {
    const node = scroller.current;
    if (node !== null && stickToBottom) {
      node.scrollTop = node.scrollHeight;
    }
  }, [transport.history.data?.items.length, transport.stream.events.length, stickToBottom]);

  useEffect(() => {
    const node = textarea.current;
    if (node === null) {
      return;
    }
    node.style.height = '0px';
    node.style.height = `${String(node.scrollHeight)}px`;
  }, [transport.answer]);

  function onScroll(): void {
    const node = scroller.current;
    if (node === null) {
      return;
    }
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    setStickToBottom(distanceFromBottom < SCROLL_BOTTOM_THRESHOLD_PX);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStickToBottom(true);
    try {
      await transport.submit();
      if (textarea.current !== null) {
        textarea.current.style.height = '';
        textarea.current.focus();
      }
    } catch {
      // Keep the unsent text, attachments, and idempotency key.
    }
  }

  const chronological = [...(transport.history.data?.items ?? [])].reverse();

  return (
    <CofounderAssistantRuntimeProvider
      messages={chronological}
      isRunning={transport.isPending}
      onSubmit={(text) => transport.submit(text)}
      onCancel={() => transport.cancelTurn()}
    >
      <div className="chat-shell">
        <div className="chat-viewport">
          <div ref={scroller} className="chat-scroll" onScroll={onScroll} aria-label="Conversation">
            {transport.history.isLoading ? (
              <p className="muted">Loading the conversation…</p>
            ) : null}
            {transport.history.isError ? (
              <p className="alert">{transport.history.error.message}</p>
            ) : null}
            {transport.history.isSuccess && chronological.length === 0 ? (
              <div className="chat-empty">
                <p className="text-sm font-medium">Ask your co-founder anything</p>
                <p className="hint">No right answer required — start with what's on your mind.</p>
              </div>
            ) : null}
            {chronological.map((message) => (
              <ConversationMessageView key={message.id} projectId={projectId} message={message} />
            ))}
            <CofounderOperationStatus
              pending={transport.isPending}
              onCancel={() => {
                void transport.cancelTurn().catch(() => undefined);
              }}
            />
          </div>
          {stickToBottom ? null : (
            <button
              type="button"
              className="chat-jump-btn min-h-11"
              onClick={() => {
                const node = scroller.current;
                if (node !== null) {
                  node.scrollTop = node.scrollHeight;
                }
                setStickToBottom(true);
              }}
            >
              New messages
            </button>
          )}
        </div>
        <CofounderComposer
          answer={transport.answer}
          setAnswer={transport.setAnswer}
          files={transport.files}
          setFiles={transport.setFiles}
          errorMessage={transport.errorMessage}
          isPending={transport.isPending}
          fileAccept={transport.fileAccept}
          maxFiles={transport.maxFiles}
          textareaRef={textarea}
          onSubmit={(event) => void onSubmit(event)}
        />
      </div>
    </CofounderAssistantRuntimeProvider>
  );
}
