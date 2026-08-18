import { describe, expect, it } from 'vitest';

import { describeToolCall, toolNameOf } from './describe-tool-call';

describe('describeToolCall', () => {
  it('uses a known template and falls back for unknown tools', () => {
    expect(describeToolCall('academic_search', { query: 'cafe owners' })).toContain('cafe owners');
    expect(describeToolCall('unknown_tool', {})).toBe('Running a step');
    expect(toolNameOf({ name: 'web_search' })).toBe('web_search');
  });
});
