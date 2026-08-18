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
    return <p className="hint">Thinking…</p>;
  }
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="panel stack-tight">
      <button type="button" className="text-left" onClick={() => setOpen((current) => !current)}>
        <p className="hint">{complete ? 'Worked this turn' : 'Working…'}</p>
        <p className="text-sm">{complete ? workedSummary(elapsed, tools) : 'Thinking'}</p>
      </button>
      {open ? (
        <ol className="flex flex-col gap-2">
          {steps.map((step) => (
            <li key={step.id} className="text-sm">
              <span className="hint">{step.status}</span>
              {step.detail === undefined ? (
                <p>{step.label}</p>
              ) : (
                <button
                  type="button"
                  className="block text-left"
                  onClick={() => setExpanded((current) => (current === step.id ? null : step.id))}
                >
                  <p>{step.label}</p>
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
