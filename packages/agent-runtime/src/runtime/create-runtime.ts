import { DeepSeekHarnessRuntime } from './deepseek-harness-runtime.js';
import { DirectStructuredRuntime } from './direct-runtime.js';
import { DisabledCofounderRuntime } from './disabled-runtime.js';
import type { CofounderRuntime } from './types.js';

export type CofounderRuntimeSelection = {
  kind: 'disabled' | 'direct' | 'harness';
  runtime: CofounderRuntime;
};

export function createCofounderRuntime(input: {
  aiMode?: 'off' | 'direct' | 'harness';
  harnessEndpoint?: string;
  harnessToken?: string;
}): CofounderRuntimeSelection {
  if (input.aiMode === 'off') {
    return { kind: 'disabled', runtime: new DisabledCofounderRuntime() };
  }
  const harnessReady =
    input.harnessEndpoint !== undefined &&
    input.harnessEndpoint.length > 0 &&
    input.harnessToken !== undefined &&
    input.harnessToken.length >= 32;
  if (input.aiMode === 'harness' && harnessReady) {
    return {
      kind: 'harness',
      runtime: new DeepSeekHarnessRuntime({
        endpoint: input.harnessEndpoint as string,
        token: input.harnessToken as string,
      }),
    };
  }
  if (input.aiMode !== 'direct' && harnessReady) {
    return {
      kind: 'harness',
      runtime: new DeepSeekHarnessRuntime({
        endpoint: input.harnessEndpoint as string,
        token: input.harnessToken as string,
      }),
    };
  }
  return { kind: 'direct', runtime: new DirectStructuredRuntime() };
}
