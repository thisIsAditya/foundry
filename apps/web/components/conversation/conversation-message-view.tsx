'use client';

import type { ConversationBlock, ConversationMessage } from '@foundry/domain';
import Link from 'next/link';
import { useState } from 'react';

import { businessModelSectionLabel, formatMessageTimestamp } from '../../lib/format';
import { projectPanelHref } from '../../lib/project-href';
import { ChatMarkdown } from './chat-markdown';

function CopyButton({ text, align }: { text: string; align: 'start' | 'end' }) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      className={`flex opacity-0 transition-opacity group-hover/msg:opacity-100 focus-within:opacity-100 ${
        align === 'end' ? 'justify-end' : 'justify-start'
      }`}
    >
      <button
        type="button"
        className="chat-copy-btn"
        aria-label={copied ? 'Copied' : 'Copy message'}
        onClick={() => {
          void navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? <CheckGlyph /> : <CopyGlyph />}
      </button>
    </div>
  );
}

function CopyGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5.5 2A1.5 1.5 0 0 0 4 3.5v7A1.5 1.5 0 0 0 5.5 12h5A1.5 1.5 0 0 0 12 10.5v-7A1.5 1.5 0 0 0 10.5 2h-5ZM5 3.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-7ZM2.5 5A.5.5 0 0 0 2 5.5v7A1.5 1.5 0 0 0 3.5 14h5a.5.5 0 0 0 0-1h-5a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 0-.5-.5Z"
      />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M13.7 4.3a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L7 9.6l5.3-5.3a1 1 0 0 1 1.4 0Z"
      />
    </svg>
  );
}

function BlockCard({ projectId, block }: { projectId: string; block: ConversationBlock }) {
  switch (block.kind) {
    case 'concise_answer':
      return <ChatMarkdown text={block.text} />;
    case 'cited_finding':
      return (
        <div className="panel stack-tight">
          <p className="hint">Cited finding</p>
          <ChatMarkdown text={block.text} />
          {block.citationIds.length === 0 ? null : (
            <p className="muted">{block.citationIds.length} citation(s)</p>
          )}
          <Link
            href={
              block.evidenceItemId === undefined
                ? projectPanelHref(projectId, 'research')
                : projectPanelHref(projectId, 'research', { finding: block.evidenceItemId })
            }
            className="text-sm"
          >
            Open research
          </Link>
        </div>
      );
    case 'assumption_card':
      return (
        <div className="panel stack-tight">
          <p className="hint">Assumption — not a fact</p>
          <ChatMarkdown text={block.text} />
        </div>
      );
    case 'proposed_plan_change':
      return (
        <div className="panel stack-tight">
          <p className="hint">Proposed plan change</p>
          <p className="text-sm">
            {block.sectionKey === undefined
              ? 'A draft revision is ready to review.'
              : `Update to ${businessModelSectionLabel(block.sectionKey)}.`}
          </p>
          <Link
            href={
              block.sectionKey === undefined
                ? projectPanelHref(projectId, 'plan')
                : projectPanelHref(projectId, 'plan', { section: block.sectionKey })
            }
            className="text-sm"
          >
            Review the diff
          </Link>
        </div>
      );
    case 'research_plan':
      return (
        <div className="panel stack-tight">
          <p className="hint">Research plan</p>
          <Link
            href={projectPanelHref(projectId, 'work', { job: block.jobId })}
            className="text-sm"
          >
            Review before it starts
          </Link>
        </div>
      );
    case 'founder_task':
      return (
        <div className="panel stack-tight">
          <p className="hint">Founder task</p>
          <Link
            href={projectPanelHref(projectId, 'work', { task: block.founderTaskId })}
            className="text-sm"
          >
            Open the task
          </Link>
        </div>
      );
    case 'job_request':
      return (
        <div className="panel stack-tight">
          <p className="hint">Job request</p>
          <Link
            href={projectPanelHref(projectId, 'work', { job: block.jobId })}
            className="text-sm"
          >
            Open the job
          </Link>
        </div>
      );
    case 'draft_action':
      return (
        <div className="panel stack-tight">
          <p className="hint">Draft help</p>
          <ChatMarkdown text={block.text} />
        </div>
      );
    case 'decision_card':
      return (
        <div className="panel stack-tight">
          <p className="hint">Decision</p>
          <ChatMarkdown text={block.text} />
          <Link href={projectPanelHref(projectId, 'decisions')} className="text-sm">
            Open decisions
          </Link>
        </div>
      );
    case 'blocker':
      return (
        <div className="panel stack-tight">
          <p className="hint">Blocked</p>
          <ChatMarkdown text={block.text} />
          {block.recoveryAction === undefined ? null : (
            <p className="muted">{block.recoveryAction}</p>
          )}
        </div>
      );
  }
}

export function ConversationMessageView({
  projectId,
  message,
}: {
  projectId: string;
  message: ConversationMessage;
}) {
  const isFounder = message.actor === 'founder';
  const material = message.blocks.filter((block) => block.kind !== 'concise_answer');
  const textBlocks = message.blocks.filter((block) => block.kind === 'concise_answer');
  const attachments = message.references.filter(
    (ref) => ref.kind === 'evidence' || ref.kind === 'source',
  );
  const plainText = textBlocks.length === 0 && material.length === 0;
  const bubbleClass = isFounder
    ? 'chat-bubble chat-bubble-founder'
    : 'chat-bubble chat-bubble-cofounder';
  const timestamp = formatMessageTimestamp(message.createdAt);

  return (
    <article
      className={isFounder ? 'chat-turn chat-turn-founder' : 'chat-turn chat-turn-cofounder'}
    >
      <p className="chat-speaker">
        {isFounder ? 'You' : 'Co-founder'}
        {timestamp === '' ? null : <span className="chat-timestamp"> · {timestamp}</span>}
      </p>
      {attachments.length === 0 ? null : (
        <ul
          className={isFounder ? 'chat-attachments' : 'flex flex-wrap gap-2'}
          aria-label="Attached files"
        >
          {attachments.map((ref) => (
            <li key={`${ref.kind}-${ref.id}`}>
              <Link
                href={projectPanelHref(projectId, 'research', { finding: ref.id })}
                className="badge no-underline"
              >
                Attached file
              </Link>
            </li>
          ))}
        </ul>
      )}
      {plainText ? (
        <div className="group/msg flex flex-col gap-1">
          <div className={bubbleClass}>
            <ChatMarkdown text={message.text} />
          </div>
          <CopyButton text={message.text} align={isFounder ? 'end' : 'start'} />
        </div>
      ) : null}
      {textBlocks.length === 0 ? null : (
        <div className={isFounder ? 'flex flex-col items-end gap-2' : 'chat-blocks'}>
          {textBlocks.map((block, index) => (
            <div
              key={`${message.id}-text-${String(index)}`}
              className="group/msg flex flex-col gap-1"
            >
              <div className={bubbleClass}>
                {block.kind === 'concise_answer' ? <ChatMarkdown text={block.text} /> : null}
              </div>
              {block.kind === 'concise_answer' ? (
                <CopyButton text={block.text} align={isFounder ? 'end' : 'start'} />
              ) : null}
            </div>
          ))}
        </div>
      )}
      {material.length === 0 ? null : (
        <div className="chat-blocks">
          {material.map((block, index) => (
            <BlockCard
              key={`${message.id}-block-${String(index)}`}
              projectId={projectId}
              block={block}
            />
          ))}
        </div>
      )}
    </article>
  );
}
