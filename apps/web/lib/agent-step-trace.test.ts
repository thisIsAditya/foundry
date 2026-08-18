import { describe, expect, it } from 'vitest';

import { eventsForRun, stepsOf, workedSummary } from './agent-step-trace';

describe('eventsForRun', () => {
  it('includes output events that have no runId while the turn is open', () => {
    const scoped = eventsForRun(
      [
        { type: 'message_started', runId: 'run-1' },
        { type: 'job_state_changed', jobId: 'job-1', fromStatus: 'proposed', toStatus: 'queued' },
        { type: 'founder_task_created', founderTaskId: 'task-1', title: 'Call three cafes' },
        {
          type: 'score_changed',
          projectId: 'p1',
          revisionId: 'r1',
          overall: 22,
          dimensions: {},
          deltaFromPrevious: null,
        },
        { type: 'message_completed', runId: 'run-1' },
        { type: 'job_state_changed', jobId: 'job-2', fromStatus: 'queued', toStatus: 'running' },
      ],
      'run-1',
    );
    expect(scoped.map((event) => event.type)).toEqual([
      'message_started',
      'job_state_changed',
      'founder_task_created',
      'score_changed',
      'message_completed',
    ]);
  });
});

describe('stepsOf', () => {
  it('renders tool rows and terminal output rows', () => {
    const steps = stepsOf(
      [
        { type: 'message_started', runId: 'run-1' },
        {
          type: 'tool_planned',
          runId: 'run-1',
          tool: { id: 't1', name: 'web_search', input: { query: 'cafes' } },
        },
        {
          type: 'tool_completed',
          runId: 'run-1',
          toolCallId: 't1',
          result: { summary: '12 listings' },
        },
        { type: 'job_state_changed', jobId: 'job-1', fromStatus: 'proposed', toStatus: 'queued' },
      ],
      'run-1',
      'proj',
    );
    expect(steps[0]).toMatchObject({
      id: 't1',
      status: 'done',
      detail: '12 listings',
    });
    expect(steps.some((step) => step.label === 'Job moved to queued')).toBe(true);
  });
});

describe('workedSummary', () => {
  it('matches the collapsed Cursor-style label', () => {
    expect(workedSummary(4, 2)).toBe('Worked for 4s · 2 tools');
    expect(workedSummary(0, 1)).toBe('Worked for 1s · 1 tool');
  });
});
