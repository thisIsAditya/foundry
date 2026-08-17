import { describe, expect, it } from 'vitest';

import { canTransitionFounderTaskStatus, nextFounderTaskStatuses } from './founder-task-status.js';

describe('founder task status', () => {
  it('allows the documented happy path', () => {
    expect(canTransitionFounderTaskStatus('proposed', 'active')).toBe(true);
    expect(canTransitionFounderTaskStatus('active', 'completed')).toBe(true);
  });

  it('allows defer and skip from proposed or active', () => {
    expect(canTransitionFounderTaskStatus('proposed', 'deferred')).toBe(true);
    expect(canTransitionFounderTaskStatus('proposed', 'skipped')).toBe(true);
    expect(canTransitionFounderTaskStatus('active', 'deferred')).toBe(true);
    expect(canTransitionFounderTaskStatus('active', 'skipped')).toBe(true);
  });

  it('allows deferred tasks to resume or skip', () => {
    expect(canTransitionFounderTaskStatus('deferred', 'active')).toBe(true);
    expect(canTransitionFounderTaskStatus('deferred', 'skipped')).toBe(true);
  });

  it('rejects reverse and skipped transitions', () => {
    expect(canTransitionFounderTaskStatus('completed', 'active')).toBe(false);
    expect(canTransitionFounderTaskStatus('skipped', 'active')).toBe(false);
    expect(nextFounderTaskStatuses('completed')).toEqual([]);
    expect(nextFounderTaskStatuses('skipped')).toEqual([]);
  });
});
