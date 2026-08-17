'use client';

import type { ConversationBlock, ConversationMessage } from '@foundry/domain';
import Link from 'next/link';

import { businessModelSectionLabel } from '../../lib/format';

function BlockCard({ projectId, block }: { projectId: string; block: ConversationBlock }) {
  switch (block.kind) {
    case 'concise_answer':
      return <p className="text-sm whitespace-pre-wrap">{block.text}</p>;
    case 'cited_finding':
      return (
        <div className="panel stack" style={{ gap: '0.5rem' }}>
          <p className="hint">Cited finding</p>
          <p className="text-sm whitespace-pre-wrap">{block.text}</p>
          {block.citationIds.length === 0 ? null : (
            <p className="muted">{block.citationIds.length} citation(s)</p>
          )}
          <Link href={`/p/${projectId}/research`} className="text-sm">
            Open research
          </Link>
        </div>
      );
    case 'assumption_card':
      return (
        <div className="panel stack" style={{ gap: '0.5rem' }}>
          <p className="hint">Assumption — not a fact</p>
          <p className="text-sm whitespace-pre-wrap">{block.text}</p>
        </div>
      );
    case 'proposed_plan_change':
      return (
        <div className="panel stack" style={{ gap: '0.5rem' }}>
          <p className="hint">Proposed plan change</p>
          <p className="text-sm">
            {block.sectionKey === undefined
              ? 'A draft revision is ready to review.'
              : `Update to ${businessModelSectionLabel(block.sectionKey)}.`}
          </p>
          <Link
            href={
              block.sectionKey === undefined
                ? `/p/${projectId}/plan`
                : `/p/${projectId}/plan/${block.sectionKey}`
            }
            className="text-sm"
          >
            Review the diff
          </Link>
        </div>
      );
    case 'research_plan':
      return (
        <div className="panel stack" style={{ gap: '0.5rem' }}>
          <p className="hint">Research plan</p>
          <Link href={`/p/${projectId}/work?job=${block.jobId}`} className="text-sm">
            Review before it starts
          </Link>
        </div>
      );
    case 'founder_task':
      return (
        <div className="panel stack" style={{ gap: '0.5rem' }}>
          <p className="hint">Founder task</p>
          <Link href={`/p/${projectId}/work?task=${block.founderTaskId}`} className="text-sm">
            Open the task
          </Link>
        </div>
      );
    case 'job_request':
      return (
        <div className="panel stack" style={{ gap: '0.5rem' }}>
          <p className="hint">Job request</p>
          <Link href={`/p/${projectId}/work?job=${block.jobId}`} className="text-sm">
            Open the job
          </Link>
        </div>
      );
    case 'draft_action':
      return (
        <div className="panel stack" style={{ gap: '0.5rem' }}>
          <p className="hint">Draft help</p>
          <p className="text-sm whitespace-pre-wrap">{block.text}</p>
        </div>
      );
    case 'decision_card':
      return (
        <div className="panel stack" style={{ gap: '0.5rem' }}>
          <p className="hint">Decision</p>
          <p className="text-sm whitespace-pre-wrap">{block.text}</p>
          <Link href={`/p/${projectId}/decisions`} className="text-sm">
            Open decisions
          </Link>
        </div>
      );
    case 'blocker':
      return (
        <div className="panel stack" style={{ gap: '0.5rem' }}>
          <p className="hint">Blocked</p>
          <p className="text-sm whitespace-pre-wrap">{block.text}</p>
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
  const material = message.blocks.filter((block) => block.kind !== 'concise_answer');
  const textBlocks = message.blocks.filter((block) => block.kind === 'concise_answer');
  return (
    <article className="stack" style={{ gap: '0.5rem' }}>
      <p className="muted">{message.actor === 'founder' ? 'You' : 'Co-founder'}</p>
      {textBlocks.length === 0 && material.length === 0 ? (
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
      ) : null}
      {textBlocks.map((block, index) => (
        <BlockCard
          key={`${message.id}-text-${String(index)}`}
          projectId={projectId}
          block={block}
        />
      ))}
      {material.map((block, index) => (
        <BlockCard
          key={`${message.id}-block-${String(index)}`}
          projectId={projectId}
          block={block}
        />
      ))}
    </article>
  );
}
