import { tool } from 'ai';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createCodeExecuteTool } from './code-tool.js';

function addTool() {
  return tool({
    description: 'Adds two numbers.',
    inputSchema: z.object({ a: z.number(), b: z.number() }),
    execute: async ({ a, b }) => ({ sum: a + b }),
  });
}

describe('createCodeExecuteTool', () => {
  it('lists the callable tools by name in the description', () => {
    const codeTool = createCodeExecuteTool({ callableTools: { add: addTool() } });
    expect(codeTool.description).toContain('add');
  });

  it('notes there are no callable tools when the set is empty', () => {
    const codeTool = createCodeExecuteTool({ callableTools: {} });
    expect(codeTool.description).toContain('No tools are callable');
  });

  it('executes a snippet that calls an allowed tool and returns the sandbox result', async () => {
    const codeTool = createCodeExecuteTool({ callableTools: { add: addTool() } });
    const output = (await codeTool.execute?.(
      { source: `const r = await callTool('add', { a: 2, b: 3 }); return r.sum;` },
      { toolCallId: 't1', messages: [] } as never,
    )) as { result: unknown; logs: string[] };
    expect(output.result).toBe(5);
  });

  it('rejects a call to a tool that was not included in callableTools', async () => {
    const codeTool = createCodeExecuteTool({ callableTools: { add: addTool() } });
    await expect(
      codeTool.execute?.({ source: `return await callTool('subtract', { a: 2, b: 3 });` }, {
        toolCallId: 't2',
        messages: [],
      } as never),
    ).rejects.toThrow(/not callable/);
  });
});
