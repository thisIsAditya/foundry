import { AppError } from '@foundry/observability';

import {
  CofounderRuntimeResultSchema,
  type CofounderRuntime,
  type CofounderRuntimeInput,
  type CofounderRuntimeResult,
} from './types.js';

export type DeepSeekHarnessRuntimeOptions = {
  endpoint: string;
  token: string;
};

type HarnessResponse = {
  result?: unknown;
  error?: string;
  category?: string;
};

function canceledError(): AppError {
  return new AppError({
    code: 'workflow_paused',
    explanation: 'The co-founder turn was canceled.',
    nextAction: 'Retry when you want to continue. Accepted record state is unchanged.',
  });
}

function isCanceled(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}

export class DeepSeekHarnessRuntime implements CofounderRuntime {
  constructor(private readonly options: DeepSeekHarnessRuntimeOptions) {}

  async run(input: CofounderRuntimeInput): Promise<CofounderRuntimeResult> {
    if (isCanceled(input.abortSignal)) {
      throw canceledError();
    }
    const timeout = AbortSignal.timeout(input.timeoutMs);
    const signal =
      input.abortSignal === undefined ? timeout : AbortSignal.any([input.abortSignal, timeout]);
    let response: Response;
    try {
      response = await fetch(`${this.options.endpoint.replace(/\/$/, '')}/v1/cofounder/run`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.options.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          operationId: input.operationId,
          founderRequest: input.founderRequest,
          contextPacket: input.contextPacket,
          timeoutMs: input.timeoutMs,
          allowedCapabilities: input.capabilityManifest,
          ...(input.capabilityToken === undefined
            ? {}
            : { capabilityToken: input.capabilityToken }),
          ...(input.capabilityInvokeUrl === undefined
            ? {}
            : { capabilityInvokeUrl: input.capabilityInvokeUrl }),
        }),
        signal,
      });
    } catch (error) {
      if (isCanceled(input.abortSignal)) {
        throw canceledError();
      }
      throw new AppError({
        code: 'workflow_failed',
        explanation:
          'The co-founder runtime could not be reached. Accepted record state is unchanged.',
        nextAction: 'Retry the turn after the runtime service is healthy.',
        cause: error,
      });
    }
    if (isCanceled(input.abortSignal)) {
      throw canceledError();
    }
    const payload = (await response.json().catch(() => ({}))) as HarnessResponse;
    if (!response.ok || payload.result === undefined) {
      throw new AppError({
        code: 'workflow_failed',
        explanation:
          'The co-founder runtime did not return a valid result. Accepted record state is unchanged.',
        nextAction: 'Retry the turn after the runtime service is healthy.',
        retryable: true,
      });
    }
    try {
      return CofounderRuntimeResultSchema.parse(payload.result);
    } catch (error) {
      throw new AppError({
        code: 'workflow_failed',
        explanation:
          'The co-founder runtime returned an invalid structured result. Accepted record state is unchanged.',
        nextAction: 'Retry the turn; no business record change was saved.',
        cause: error,
      });
    }
  }
}
