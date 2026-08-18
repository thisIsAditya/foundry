'use client';

import type { StreamEvent } from '@foundry/api-contracts';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { stepsOf, workedSummary } from '../../lib/agent-step-trace';

export function AgentStepTrace({
  projectId,
  events,
  runId,
  complete,
}: {
  projectId: string;
  events: StreamEvent[];
  runId: string;
  complete: boolean;
}) {
  const [open, setOpen] = useState(!complete);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);
  const steps = useMemo(() => stepsOf(events, runId, projectId), [events, projectId, runId]);

  useEffect(() => {
    startedAt.current = runId.length === 0 ? null : Date.now();
    setElapsed(0);
  }, [runId]);

  useEffect(() => {
    if (startedAt.current === null) {
      return;
    }
    if (complete) {
      setElapsed(Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
      return;
    }
    const tick = window.setInterval(() => {
      if (startedAt.current !== null) {
        setElapsed(Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
      }
    }, 1000);
    return () => window.clearInterval(tick);
  }, [complete, runId]);

  useEffect(() => {
    if (complete) {
      setOpen(false);
    }
  }, [complete]);

  const tools = steps.filter((step) => step.kind === 'tool').length;
  if (steps.length === 0 && !complete) {
    return (
      <p className="chat-trace-idle" aria-live="polite">
        <span className="chat-thinking-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        Thinking…
      </p>
    );
  }
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="chat-trace">
      <button
        type="button"
        className="chat-trace-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <ChevronGlyph
          className={open ? 'chat-trace-chevron chat-trace-chevron-open' : 'chat-trace-chevron'}
        />
        <span>{complete ? workedSummary(elapsed, tools) : 'Thinking…'}</span>
      </button>
      {open ? (
        <ol className="chat-trace-steps">
          {steps.map((step) => (
            <li key={step.id} className="chat-trace-step">
              {step.detail === undefined ? (
                <p>
                  <span className="chat-trace-step-status">{step.status}</span>
                  {step.label}
                </p>
              ) : (
                <button
                  type="button"
                  className="block text-left"
                  onClick={() => setExpanded((current) => (current === step.id ? null : step.id))}
                >
                  <p>
                    <span className="chat-trace-step-status">{step.status}</span>
                    {step.label}
                  </p>
                  {expanded === step.id ? <p className="hint">{step.detail}</p> : null}
                </button>
              )}
              {step.href === undefined ? null : (
                <Link href={step.href} className="text-sm">
                  Open research
                </Link>
              )}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function ChevronGlyph({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path fill="currentColor" d="M6 3.5 11 8l-5 4.5-.9-1 4-3.5-4-3.5.9-1Z" />
    </svg>
  );
}
