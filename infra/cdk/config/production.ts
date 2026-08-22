import type { EnvironmentConfig } from './types.js';

export const productionEnvironment: EnvironmentConfig = {
  name: 'production',
  region: 'ap-south-1',
  githubOwner: 'CHANGE_ME',
  githubRepo: 'BusinessGenerator',
  natGateways: 2,
  isolatedDbSubnets: true,
  rds: {
    instanceSize: 'small',
    multiAz: true,
    deletionProtection: true,
    backupRetentionDays: 7,
  },
  web: {
    cpu: 512,
    memoryMiB: 1024,
    desiredCount: 2,
    minCount: 2,
    maxCount: 6,
  },
  worker: {
    cpu: 512,
    memoryMiB: 1024,
    desiredCount: 1,
  },
  logRetentionDays: 30,
  monthlyBudgetUsd: 165,
  bedrockBearerTokenSecretName: 'foundry/production/bedrock-bearer-token',
  exaApiKeySecretName: 'foundry/production/exa-api-key',
};
