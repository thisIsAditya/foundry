'use client';

import type { StreamEvent } from '@foundry/api-contracts';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { describeToolCall, toolInputOf, toolNameOf } from '../../lib/describe-tool-call';
import { projectPanelHref } from '../../lib/project-href';

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
  const steps = useMemo(() => stepsOf(events, runId, projectId), [events, projectId, runId]);
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
    <div className="panel stack" style={{ gap: '0.5rem' }}>
      <button type="button" className="text-left" onClick={() => setOpen((current) => !current)}>
        <p className="hint">{complete ? 'Worked this turn' : 'Working…'}</p>
        <p className="text-sm">
          {complete ? `Worked · ${String(tools)} tool${tools === 1 ? '' : 's'}` : 'Thinking'}
        </p>
      </button>
      {open ? (
        <ol className="flex flex-col gap-2">
          {steps.map((step) => (
            <li key={step.id} className="text-sm">
              <span className="hint">{step.status}</span>
              <p>{step.label}</p>
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

type TraceStep = {
  id: string;
  kind: 'tool' | 'output';
  status: string;
  label: string;
  href?: string;
};

function stepsOf(events: StreamEvent[], runId: string, projectId: string): TraceStep[] {
  const scoped = events.filter((event) => 'runId' in event && event.runId === runId);
  const tools = new Map<string, TraceStep>();
  const extras: TraceStep[] = [];
  for (const event of scoped) {
    switch (event.type) {
      case 'message_started':
        extras.push({ id: 'thinking', kind: 'output', status: 'started', label: 'Thinking' });
        break;
      case 'tool_planned': {
        const name = toolNameOf(event.tool);
        const id = toolCallIdOf(event.tool) ?? name;
        tools.set(id, {
          id,
          kind: 'tool',
          status: 'planned',
          label: describeToolCall(name, toolInputOf(event.tool)),
        });
        break;
      }
      case 'tool_started':
        updateTool(tools, event.toolCallId, 'running');
        break;
      case 'tool_progress':
        updateTool(tools, event.toolCallId, 'running');
        break;
      case 'tool_completed':
        updateTool(tools, event.toolCallId, 'done');
        break;
      case 'evidence_found':
        extras.push({
          id: `evidence-${String(extras.length)}`,
          kind: 'output',
          status: 'found',
          label: evidenceLabel(event.evidence),
          href: projectPanelHref(projectId, 'research'),
        });
        break;
      case 'job_state_changed':
        extras.push({
          id: `job-${event.jobId}`,
          kind: 'output',
          status: event.toStatus,
          label: `Job moved to ${event.toStatus}`,
        });
        break;
      case 'founder_task_created':
        extras.push({
          id: `task-${event.founderTaskId}`,
          kind: 'output',
          status: 'created',
          label: event.title,
        });
        break;
      case 'score_changed':
        extras.push({
          id: `score-${event.revisionId}`,
          kind: 'output',
          status: 'updated',
          label: `Score is now ${String(Math.round(event.overall))}`,
        });
        break;
      default:
        break;
    }
  }
  return [
    ...tools.values(),
    ...extras.filter((step) => step.id !== 'thinking' || tools.size === 0),
  ];
}

function updateTool(tools: Map<string, TraceStep>, toolCallId: string, status: string): void {
  const existing = tools.get(toolCallId) ?? [...tools.values()].at(-1);
  if (existing === undefined) {
    tools.set(toolCallId, {
      id: toolCallId,
      kind: 'tool',
      status,
      label: 'Running a step',
    });
    return;
  }
  tools.set(existing.id, { ...existing, status });
}

function toolCallIdOf(tool: unknown): string | null {
  if (tool === null || typeof tool !== 'object') {
    return null;
  }
  const record = tool as Record<string, unknown>;
  if (typeof record.id === 'string' && record.id.length > 0) {
    return record.id;
  }
  if (typeof record.toolCallId === 'string' && record.toolCallId.length > 0) {
    return record.toolCallId;
  }
  return null;
}

function evidenceLabel(evidence: unknown): string {
  if (evidence !== null && typeof evidence === 'object' && 'count' in evidence) {
    const count = (evidence as { count: unknown }).count;
    if (typeof count === 'number') {
      return `Found ${String(count)} source${count === 1 ? '' : 's'}`;
    }
  }
  return 'Found sources';
}
