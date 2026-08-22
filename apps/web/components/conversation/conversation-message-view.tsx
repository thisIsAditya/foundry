'use client';

import type { ConversationBlock, ConversationMessage, CofounderTurnBlock } from '@foundry/domain';
import Link from 'next/link';
import { useState } from 'react';

import { formatMessageTimestamp } from '../../lib/format';
import { projectEvidenceHref, projectJourneyHref } from '../../lib/project-href';
import { ChatMarkdown } from './chat-markdown';
import { CofounderProposalCard } from '../cofounder/cofounder-proposal-card';
import { CofounderReferenceList } from '../cofounder/cofounder-reference-list';
import { CofounderResponseFrame } from '../cofounder/cofounder-response-frame';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="chat-copy-btn"
      aria-label={copied ? 'Copied' : 'Copy message'}
      title={copied ? 'Copied' : 'Copy'}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <CopiedGlyph /> : <CopyGlyph />}
    </button>
  );
}

function CopyGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-3.5"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.2" />
      <path d="M10.5 5.5V3.8A1.3 1.3 0 0 0 9.2 2.5H3.8A1.3 1.3 0 0 0 2.5 3.8v5.4A1.3 1.3 0 0 0 3.8 10.5H5.5" />
    </svg>
  );
}

function CopiedGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-3.5"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

function ArchivedWork({ children }: { children: string }) {
  return (
    <div className="panel stack-tight">
      <p className="hint">Archived work from the previous sprint product</p>
      <p className="muted">{children}</p>
    </div>
  );
}

function CofounderTurnCard({ projectId, block }: { projectId: string; block: CofounderTurnBlock }) {
  return (
    <CofounderResponseFrame type={block.interactionType}>
      <ChatMarkdown text={block.explanation} />
      {block.facts === undefined || block.facts.length === 0 ? null : (
        <div className="stack-tight">
          <p className="hint">Facts from stored sources</p>
          <ul className="hint">
            {block.facts.map((fact) => (
              <li key={fact.statement}>{fact.statement}</li>
            ))}
          </ul>
        </div>
      )}
      {block.interpretation === undefined || block.interpretation.length === 0 ? null : (
        <p className="muted">Interpretation: {block.interpretation}</p>
      )}
      {block.assumptions === undefined || block.assumptions.length === 0 ? null : (
        <p className="hint">Assumptions: {block.assumptions.join(' ')}</p>
      )}
      {block.recommendation === undefined || block.recommendation.length === 0 ? null : (
        <p className="text-sm">Recommendation: {block.recommendation}</p>
      )}
      {block.uncertainty.length === 0 ? null : <p className="hint">{block.uncertainty}</p>}
      {block.blockedConditions.length === 0 ? null : (
        <p className="muted">{block.blockedConditions.join(' ')}</p>
      )}
      <CofounderReferenceList projectId={projectId} references={block.references} />
      {block.proposalId === null ? null : (
        <CofounderProposalCard projectId={projectId} proposalId={block.proposalId} />
      )}
      {block.stepId === null ? null : (
        <Link
          className="min-h-11 inline-flex items-center"
          href={projectJourneyHref(projectId, block.stepId)}
        >
          Open the related step
        </Link>
      )}
    </CofounderResponseFrame>
  );
}

function BlockCard({ projectId, block }: { projectId: string; block: ConversationBlock }) {
  switch (block.kind) {
    case 'concise_answer':
      return <ChatMarkdown text={block.text} />;
    case 'cofounder_turn':
      return <CofounderTurnCard projectId={projectId} block={block} />;
    case 'cited_finding':
      return (
        <div className="panel stack-tight">
          <p className="hint">Cited finding</p>
          <ChatMarkdown text={block.text} />
          <Link
            href={projectEvidenceHref(projectId)}
            className="text-sm min-h-11 inline-flex items-center"
          >
            Open evidence
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
    case 'decision_card':
      return (
        <div className="panel stack-tight">
          <p className="hint">Decision</p>
          <ChatMarkdown text={block.text} />
        </div>
      );
    case 'draft_action':
      return (
        <div className="panel stack-tight">
          <p className="hint">Draft help</p>
          <ChatMarkdown text={block.text} />
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
    case 'proposed_plan_change':
      return (
        <ArchivedWork>
          A previous plan-change card. Open the model to review the current record.
        </ArchivedWork>
      );
    case 'research_plan':
    case 'job_request':
      return (
        <ArchivedWork>A previous research job. That sprint path is no longer in use.</ArchivedWork>
      );
    case 'founder_task':
      return (
        <ArchivedWork>
          A previous founder task. Continue from the current journey step instead.
        </ArchivedWork>
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
        <ul className="flex flex-wrap gap-2" aria-label="Attached files">
          {attachments.map((ref) => (
            <li key={`${ref.kind}-${ref.id}`}>
              <Link
                href={projectEvidenceHref(projectId)}
                className="badge no-underline min-h-11 inline-flex items-center"
              >
                Attached file
              </Link>
            </li>
          ))}
        </ul>
      )}
      {plainText ? (
        <div className="flex flex-col gap-1">
          <div className={bubbleClass}>
            <ChatMarkdown text={message.text} />
          </div>
          <CopyButton text={message.text} />
        </div>
      ) : null}
      {textBlocks.length === 0 ? null : (
        <div className={isFounder ? 'flex flex-col items-end gap-2' : 'chat-blocks'}>
          {textBlocks.map((block, index) => (
            <div key={`${message.id}-text-${String(index)}`} className="flex flex-col gap-1">
              <div className={bubbleClass}>
                {block.kind === 'concise_answer' ? <ChatMarkdown text={block.text} /> : null}
              </div>
              {block.kind === 'concise_answer' ? <CopyButton text={block.text} /> : null}
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
      {isFounder || material.some((block) => block.kind === 'cofounder_turn') ? null : (
        <p className="hint">Historic Inform content. Typed interaction details were not stored.</p>
      )}
    </article>
  );
}
