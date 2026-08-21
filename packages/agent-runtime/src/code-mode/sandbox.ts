import {
  getQuickJS,
  type QuickJSContext,
  type QuickJSHandle,
  type QuickJSRuntime,
} from 'quickjs-emscripten';

export type CodeModeLimits = {
  maxExecutionMs: number;
  maxMemoryBytes: number;
  maxSourceBytes: number;
  maxResultBytes: number;
};

export type CodeModeToolCall = (toolName: string, args: unknown) => Promise<unknown>;

export type CodeModeRunInput = {
  source: string;
  callTool: CodeModeToolCall;
  limits: CodeModeLimits;
};

export type CodeModeRunResult = {
  result: unknown;
  logs: string[];
  /** True when `result` had to be truncated to fit `limits.maxResultBytes`; in that case
   * `result` is the truncated JSON string rather than the parsed value. */
  truncatedResult: boolean;
};

export class CodeModeTimeoutError extends Error {
  constructor(maxExecutionMs: number) {
    super(`code.execute exceeded its ${maxExecutionMs}ms execution budget`);
    this.name = 'CodeModeTimeoutError';
  }
}

export class CodeModeSourceTooLargeError extends Error {
  constructor(maxSourceBytes: number) {
    super(`code.execute source exceeds the ${maxSourceBytes}-byte limit`);
    this.name = 'CodeModeSourceTooLargeError';
  }
}

const MAX_LOG_LINES = 20;
const MAX_LOG_LINE_CHARS = 500;

/**
 * A narrow, compute-only JavaScript sandbox for the `code.execute` tool (plan §"code-mode/").
 * Runs model-authored snippets inside an in-process QuickJS VM, bounded by `limits.codeMode` on
 * source size, wall-clock time, heap memory, and returned-result size. No filesystem, network,
 * process, or Node globals are reachable from inside — the only bridge to the host is the
 * `callTool(name, args)` global, wired by the caller to a fixed, already-risk-filtered set of
 * tools (see `code-tool.ts`), so the guest can never reach anything the outer run couldn't.
 */
export class CodeModeSandbox {
  async run(input: CodeModeRunInput): Promise<CodeModeRunResult> {
    if (Buffer.byteLength(input.source, 'utf8') > input.limits.maxSourceBytes) {
      throw new CodeModeSourceTooLargeError(input.limits.maxSourceBytes);
    }

    const quickJS = await getQuickJS();
    const runtime = quickJS.newRuntime();
    const deadline = Date.now() + input.limits.maxExecutionMs;
    runtime.setMemoryLimit(input.limits.maxMemoryBytes);
    runtime.setInterruptHandler(() => Date.now() > deadline);
    const context = runtime.newContext();
    const logs: string[] = [];

    try {
      return await this.runInContext(context, input, logs, deadline);
    } catch (error) {
      // A model-authored infinite loop is interrupted mid-bytecode, which surfaces as a generic
      // QuickJS "interrupted" error rather than our own error type — normalize it here so callers
      // can rely on `CodeModeTimeoutError` regardless of which phase (sync eval vs. pending-job
      // draining) the deadline was hit in.
      if (Date.now() > deadline) {
        throw new CodeModeTimeoutError(input.limits.maxExecutionMs);
      }
      throw error;
    } finally {
      this.disposeQuietly(context, runtime);
    }
  }

  private async runInContext(
    context: QuickJSContext,
    input: CodeModeRunInput,
    logs: string[],
    deadline: number,
  ): Promise<CodeModeRunResult> {
    const jsonParseHandle = this.getJsonParse(context);
    try {
      this.installConsole(context, logs);
      this.installCallTool(context, input.callTool, jsonParseHandle);

      const resultHandle = await this.evalUntilSettled(context, input.source, deadline);
      try {
        const value = context.dump(resultHandle);
        const serialized = JSON.stringify(value) ?? 'null';
        const truncatedResult = Buffer.byteLength(serialized, 'utf8') > input.limits.maxResultBytes;
        return {
          result: truncatedResult ? serialized.slice(0, input.limits.maxResultBytes) : value,
          logs,
          truncatedResult,
        };
      } finally {
        resultHandle.dispose();
      }
    } finally {
      jsonParseHandle.dispose();
    }
  }

  /** Disposes a QuickJS VM that may have been interrupted mid-operation. A runtime that hit its
   * deadline or memory limit while holding live objects can leave QuickJS's own GC bookkeeping
   * unable to free cleanly, and `dispose()` throws in that case (a known upstream issue —
   * https://github.com/justjake/quickjs-emscripten/issues/235). Letting that failure escape
   * would replace/mask whatever real error the run produced and, worse, look like a crash to
   * callers; a throwaway per-run VM's native memory leaking once is the safer trade-off. */
  private disposeQuietly(context: QuickJSContext, runtime: QuickJSRuntime): void {
    try {
      context.dispose();
    } catch {
      // See method doc.
    }
    try {
      runtime.dispose();
    } catch {
      // See method doc.
    }
  }

  private async evalUntilSettled(
    context: QuickJSContext,
    source: string,
    deadline: number,
  ): Promise<QuickJSHandle> {
    const promiseHandle = context.unwrapResult(context.evalCode(`(async () => {\n${source}\n})()`));
    try {
      const settledPromise = context.resolvePromise(promiseHandle);
      let settled = false;
      void settledPromise.finally(() => {
        settled = true;
      });
      while (!settled) {
        context.runtime.executePendingJobs();
        if (Date.now() > deadline) {
          // Normalized to `CodeModeTimeoutError` with the real limit by the caller in `run()`.
          throw new Error('code.execute deadline exceeded while draining pending tool-call jobs');
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      return context.unwrapResult(await settledPromise);
    } finally {
      promiseHandle.dispose();
    }
  }

  private getJsonParse(context: QuickJSContext): QuickJSHandle {
    const jsonHandle = context.getProp(context.global, 'JSON');
    const parseHandle = context.getProp(jsonHandle, 'parse');
    jsonHandle.dispose();
    return parseHandle;
  }

  private installConsole(context: QuickJSContext, logs: string[]): void {
    const consoleHandle = context.newObject();
    const logFn = context.newFunction('log', (...args) => {
      if (logs.length >= MAX_LOG_LINES) {
        return;
      }
      const line = args.map((arg) => this.stringifyHandle(context, arg)).join(' ');
      logs.push(line.slice(0, MAX_LOG_LINE_CHARS));
    });
    context.setProp(consoleHandle, 'log', logFn);
    logFn.dispose();
    context.setProp(context.global, 'console', consoleHandle);
    consoleHandle.dispose();
  }

  private stringifyHandle(context: QuickJSContext, handle: QuickJSHandle): string {
    try {
      const value = context.dump(handle);
      return typeof value === 'string' ? value : JSON.stringify(value);
    } catch {
      return '[unserializable]';
    }
  }

  /** Bridges `await callTool(name, args)` in the guest to the host's async tool call, round
   * tripping the result through the guest's own `JSON.parse` rather than hand-building QuickJS
   * handles for arbitrary nested values. */
  private installCallTool(
    context: QuickJSContext,
    callTool: CodeModeToolCall,
    jsonParseHandle: QuickJSHandle,
  ): void {
    const fn = context.newFunction('callTool', (nameHandle, argsHandle) => {
      const name = context.getString(nameHandle);
      const args = argsHandle === undefined ? undefined : context.dump(argsHandle);
      const deferred = context.newPromise();
      deferred.settled.catch(() => {
        // The guest observes rejection via `deferred.reject`; this only silences Node's
        // unhandled-rejection warning if the guest never awaits the call.
      });
      callTool(name, args)
        .then((value) => {
          const json = JSON.stringify(value ?? null) ?? 'null';
          const jsonHandle = context.newString(json);
          try {
            const parsed = context.unwrapResult(
              context.callFunction(jsonParseHandle, context.undefined, jsonHandle),
            );
            deferred.resolve(parsed);
            parsed.dispose();
          } finally {
            jsonHandle.dispose();
          }
        })
        .catch((error: unknown) => {
          const errorHandle = context.newError(
            error instanceof Error ? error.message : String(error),
          );
          deferred.reject(errorHandle);
          errorHandle.dispose();
        })
        .finally(() => deferred.dispose());
      return deferred.handle;
    });
    context.setProp(context.global, 'callTool', fn);
    fn.dispose();
  }
}
