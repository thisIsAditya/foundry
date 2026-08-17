import { describe, expect, it } from 'vitest';

import {
  canTransitionSprintStatus,
  nextSprintStatuses,
  toProductJobStatus,
} from './execution-status.js';

describe('sprint / AI job status', () => {
  it('keeps the original internal happy path', () => {
    expect(canTransitionSprintStatus('draft', 'contracted')).toBe(true);
    expect(canTransitionSprintStatus('contracted', 'running')).toBe(true);
    expect(canTransitionSprintStatus('running', 'closed')).toBe(true);
  });

  it('supports the product job vocabulary transitions', () => {
    expect(canTransitionSprintStatus('proposed', 'queued')).toBe(true);
    expect(canTransitionSprintStatus('queued', 'running')).toBe(true);
    expect(canTransitionSprintStatus('running', 'needs_founder')).toBe(true);
    expect(canTransitionSprintStatus('running', 'needs_approval')).toBe(true);
    expect(canTransitionSprintStatus('needs_approval', 'complete')).toBe(true);
    expect(canTransitionSprintStatus('queued', 'expired')).toBe(true);
  });

  it('maps internal statuses onto product-facing statuses', () => {
    expect(toProductJobStatus('draft')).toBe('proposed');
    expect(toProductJobStatus('contracted')).toBe('queued');
    expect(toProductJobStatus('paused')).toBe('needs_founder');
    expect(toProductJobStatus('stalled')).toBe('needs_founder');
    expect(toProductJobStatus('closed')).toBe('complete');
    expect(toProductJobStatus('failed')).toBe('failed');
    expect(toProductJobStatus('canceled')).toBe('canceled');
  });

  it('treats terminal product states as closed', () => {
    expect(nextSprintStatuses('complete')).toEqual([]);
    expect(nextSprintStatuses('canceled')).toEqual([]);
    expect(nextSprintStatuses('expired')).toEqual([]);
    expect(nextSprintStatuses('failed')).toEqual([]);
  });
});
