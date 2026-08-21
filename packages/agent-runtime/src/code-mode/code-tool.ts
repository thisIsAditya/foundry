import { randomUUID } from 'node:crypto';

import { limits } from '@foundry/config/limits';
import { tool, type Tool, type ToolSet } from 'ai';
import { z } from 'zod';

import { CodeModeSandbox, type CodeModeLimits } from './sandbox.js';

export const CODE_EXECUTE_TOOL_NAME = 'code.execute';

const CodeExecuteInputSchema = z.object({
  source: z
    .string()
    .describe(
      'JavaScript source for an async function body (no `function`/`async` wrapper needed). ' +
        'Call `await callTool(name, args)` to invoke one of the callable tools named in this ' +
        "tool's description. `console.log(...)` output and the final expression's value are " +
        'both returned. There is no network, filesystem, or Node access from inside.',
    ),
});

export type CreateCodeExecuteToolInput = {
  /** Tools this run's risk ceiling already admits and that the sandbox may reach by name via
   * `callTool` — enforced independently of whatever the outer run's `activeTools` narrows to on
   * a given step (plan §"defense in depth": `side_effect`/`draft`/`forbidden` tools are never
   * passed in here, so they're never reachable from inside no matter what). */
  callableTools: ToolSet;
  limits?: CodeModeLimits;
  sandbox?: CodeModeSandbox;
};

async function resolveToolOutput<T>(value: AsyncIterable<T> | PromiseLike<T> | T): Promise<T> {
  if (typeof value === 'object' && value !== null && Symbol.asyncIterator in value) {
    let last: T | undefined;
    for await (const chunk of value as AsyncIterable<T>) {
      last = chunk;
    }
    return last as T;
  }
  return value as T;
}

/**
 * Builds the `code.execute` tool (plan §"code-mode/code-tool.ts"): one tool the model can call
 * to run a short snippet that combines/filters/computes over several tool calls in a single
 * step, rather than round-tripping through the model once per tool call. Off by default —
 * callers only add this to a `FoundryAgent` run when `codeMode` is explicitly enabled.
 */
export function createCodeExecuteTool(input: CreateCodeExecuteToolInput): Tool {
  const sandbox = input.sandbox ?? new CodeModeSandbox();
  const codeLimits = input.limits ?? limits.codeMode;
  const toolNames = Object.keys(input.callableTools);

  return tool({
    description: [
      'Run a short JavaScript snippet to combine, filter, or compute over the results of ' +
        'multiple tool calls in one step, instead of calling them one at a time.',
      toolNames.length === 0
        ? 'No tools are callable from inside this snippet right now.'
        : `Callable via \`await callTool(name, args)\`: ${toolNames.join(', ')}.`,
    ].join(' '),
    inputSchema: CodeExecuteInputSchema,
    execute: async ({ source }) => {
      const outcome = await sandbox.run({
        source,
        limits: codeLimits,
        callTool: async (name, args) => {
          const requestedTool = input.callableTools[name];
          if (requestedTool?.execute === undefined) {
            throw new Error(`Tool "${name}" is not callable from code.execute in this run.`);
          }
          const output = requestedTool.execute(args, {
            toolCallId: randomUUID(),
            messages: [],
            context: undefined,
          } as unknown as Parameters<NonNullable<Tool['execute']>>[1]);
          return resolveToolOutput(output);
        },
      });
      return outcome;
    },
  }) as Tool;
}
