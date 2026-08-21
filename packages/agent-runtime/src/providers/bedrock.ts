import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { limits } from '@foundry/config/limits';
import type { ProviderConnection } from '@foundry/domain';
import { AppError } from '@foundry/observability';

import { bedrockCapabilities } from './capabilities.js';
import type { BuiltModel } from './resolve-key.js';

export function bedrockProvider(connection: ProviderConnection, modelId: string): BuiltModel {
  if (connection.authMode !== 'aws_iam_role') {
    throw new AppError({
      code: 'capability_unsupported',
      explanation: 'Bedrock connections must use the AWS credential chain.',
      nextAction:
        'Reconnect Bedrock with auth mode aws_iam_role and provide AWS credentials or an IAM role to the server.',
    });
  }
  const region = connection.endpointOrRegion ?? limits.provider.defaultBedrockRegion;
  const provider = createAmazonBedrock({ region });
  return { model: provider(modelId), capabilities: bedrockCapabilities };
}
