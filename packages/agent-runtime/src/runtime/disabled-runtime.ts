import { AppError } from '@foundry/observability';

import type { CofounderRuntime, CofounderRuntimeResult } from './types.js';

export class DisabledCofounderRuntime implements CofounderRuntime {
  async run(): Promise<CofounderRuntimeResult> {
    throw new AppError({
      code: 'workflow_failed',
      explanation:
        'The co-founder is disabled in this environment. Accepted record state is unchanged.',
      nextAction: 'Continue from Journey, Model, Evidence, or Decisions. Enable AI to use chat.',
      retryable: false,
    });
  }
}
