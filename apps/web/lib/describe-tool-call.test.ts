import { describe, expect, it } from 'vitest';

import { describeToolCall, summarizeToolResult, toolNameOf } from './describe-tool-call';

describe('describeToolCall', () => {
  it('uses a known template and falls back for unknown tools', () => {
    expect(describeToolCall('academic_search', { query: 'cafe owners' })).toContain('cafe owners');
    expect(describeToolCall('unknown_tool', {})).toBe('Running a step');
    expect(toolNameOf({ name: 'web_search' })).toBe('web_search');
  });
});

describe('summarizeToolResult', () => {
  it('prints a short label instead of raw JSON', () => {
    expect(summarizeToolResult({ summary: '12 cafe listings' })).toBe('12 cafe listings');
    expect(summarizeToolResult({ ok: true })).toBe('Step finished');
    expect(summarizeToolResult(null)).toBeNull();
  });
});
