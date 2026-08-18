import type { StreamEvent } from '@foundry/api-contracts';

import {
  describeToolCall,
  summarizeToolResult,
  toolInputOf,
  toolNameOf,
} from './describe-tool-call';
import { projectPanelHref } from './project-href';

export type TraceStep = {
  id: string;
  kind: 'tool' | 'output';
  status: string;
  label: string;
  detail?: string;
  href?: string;
};

export function eventsForRun(events: readonly StreamEvent[], runId: string): StreamEvent[] {
  if (runId.length === 0) {
    return [];
  }
  const scoped: StreamEvent[] = [];
  let inside = false;
  for (const event of events) {
    const sameRun = 'runId' in event && event.runId === runId;
    if (event.type === 'message_started' && sameRun) {
      inside = true;
    }
    if (sameRun || (inside && !('runId' in event))) {
      scoped.push(event);
    }
    if (event.type === 'message_completed' && sameRun) {
      inside = false;
    }
  }
  return scoped;
}

export function stepsOf(
  events: readonly StreamEvent[],
  runId: string,
  projectId: string,
): TraceStep[] {
  const tools = new Map<string, TraceStep>();
  const extras: TraceStep[] = [];
  for (const event of eventsForRun(events, runId)) {
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
        updateTool(tools, event.toolCallId, 'done', summarizeToolResult(event.result));
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

export function workedSummary(seconds: number, tools: number): string {
  const duration = seconds < 1 ? '1s' : `${String(seconds)}s`;
  return `Worked for ${duration} · ${String(tools)} tool${tools === 1 ? '' : 's'}`;
}

function updateTool(
  tools: Map<string, TraceStep>,
  toolCallId: string,
  status: string,
  detail?: string | null,
): void {
  const existing = tools.get(toolCallId) ?? [...tools.values()].at(-1);
  if (existing === undefined) {
    tools.set(toolCallId, {
      id: toolCallId,
      kind: 'tool',
      status,
      label: 'Running a step',
      ...(detail === null || detail === undefined ? {} : { detail }),
    });
    return;
  }
  tools.set(existing.id, {
    ...existing,
    status,
    ...(detail === null || detail === undefined ? {} : { detail }),
  });
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
