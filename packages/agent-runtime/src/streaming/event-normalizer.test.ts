import { describe, expect, it } from 'vitest';

import { normalize } from './event-normalizer.js';

describe('stream event normalizer', () => {
  it('maps text-delta parts and drops unknown shapes', () => {
    expect(normalize({ type: 'text-delta', text: 'Hello' }, { runId: 'run-1' })).toEqual({
      type: 'text_delta',
      runId: 'run-1',
      delta: 'Hello',
    });
    expect(normalize({ type: 'text-delta', delta: 'Hi' }, { runId: 'run-1' })).toEqual({
      type: 'text_delta',
      runId: 'run-1',
      delta: 'Hi',
    });
    expect(
      normalize({ type: 'provider-raw', payload: { secret: 'nope' } }, { runId: 'run-1' }),
    ).toBeNull();
  });

  it('passes through job, founder-task, score, and conversation events', () => {
    expect(
      normalize(
        { type: 'job_state_changed', jobId: 'job-1', fromStatus: 'running', toStatus: 'closed' },
        { runId: 'run-1' },
      ),
    ).toEqual({
      type: 'job_state_changed',
      jobId: 'job-1',
      fromStatus: 'running',
      toStatus: 'closed',
    });
  });
});
