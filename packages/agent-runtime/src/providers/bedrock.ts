import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import type { ProviderConnection } from '@foundry/domain';
import { AppError } from '@foundry/observability';

import { bedrockCapabilities } from './capabilities.js';
import type { BuiltModel } from './resolve-key.js';

export function bedrockProvider(connection: ProviderConnection, modelId: string): BuiltModel {
  if (connection.authMode !== 'aws_iam_role') {
    throw new AppError({
      code: 'capability_unsupported',
      explanation: 'Bedrock connections must use the ECS task IAM role.',
      nextAction: 'Reconnect Bedrock with auth mode aws_iam_role.',
    });
  }
  const region = connection.endpointOrRegion ?? 'ap-south-1';
  const provider = createAmazonBedrock({ region });
  return { model: provider(modelId), capabilities: bedrockCapabilities };
}
