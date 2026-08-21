import { describe, expect, it } from 'vitest';

import { CodeModeSandbox, CodeModeTimeoutError } from './sandbox.js';

const limits = {
  maxExecutionMs: 500,
  maxMemoryBytes: 32 * 1024 * 1024,
  maxSourceBytes: 20 * 1024,
  maxResultBytes: 4 * 1024,
};

describe('CodeModeSandbox', () => {
  it('evaluates a plain expression with no tool calls', async () => {
    const sandbox = new CodeModeSandbox();
    const outcome = await sandbox.run({
      source: 'return 1 + 2;',
      limits,
      callTool: async () => {
        throw new Error('should not be called');
      },
    });
    expect(outcome.result).toBe(3);
    expect(outcome.truncatedResult).toBe(false);
  });

  it('bridges await callTool(name, args) to the host and returns the resolved value', async () => {
    const sandbox = new CodeModeSandbox();
    const calls: Array<{ name: string; args: unknown }> = [];
    const outcome = await sandbox.run({
      source: `
        const first = await callTool('add', { a: 2, b: 3 });
        const second = await callTool('add', { a: first.sum, b: 10 });
        return second.sum;
      `,
      limits,
      callTool: async (name, args) => {
        calls.push({ name, args });
        const { a, b } = args as { a: number; b: number };
        return { sum: a + b };
      },
    });
    expect(outcome.result).toBe(15);
    expect(calls).toEqual([
      { name: 'add', args: { a: 2, b: 3 } },
      { name: 'add', args: { a: 5, b: 10 } },
    ]);
  });

  it('captures console.log output up to the line cap', async () => {
    const sandbox = new CodeModeSandbox();
    const outcome = await sandbox.run({
      source: `
        console.log('hello', 42, { ok: true });
        return 'done';
      `,
      limits,
      callTool: async () => undefined,
    });
    expect(outcome.result).toBe('done');
    expect(outcome.logs).toEqual(['hello 42 {"ok":true}']);
  });

  it('propagates a rejected tool call as a thrown guest error', async () => {
    const sandbox = new CodeModeSandbox();
    await expect(
      sandbox.run({
        source: `await callTool('boom', {});`,
        limits,
        callTool: async () => {
          throw new Error('tool failed');
        },
      }),
    ).rejects.toThrow(/tool failed/);
  });

  it('throws CodeModeTimeoutError on an infinite synchronous loop', async () => {
    const sandbox = new CodeModeSandbox();
    await expect(
      sandbox.run({
        source: `while (true) {}`,
        limits: { ...limits, maxExecutionMs: 100 },
        callTool: async () => undefined,
      }),
    ).rejects.toThrow(CodeModeTimeoutError);
  });

  it('truncates a result larger than maxResultBytes', async () => {
    const sandbox = new CodeModeSandbox();
    const outcome = await sandbox.run({
      source: `return 'x'.repeat(10000);`,
      limits: { ...limits, maxResultBytes: 100 },
      callTool: async () => undefined,
    });
    expect(outcome.truncatedResult).toBe(true);
    expect(typeof outcome.result).toBe('string');
    expect((outcome.result as string).length).toBeLessThanOrEqual(100);
  });
});
