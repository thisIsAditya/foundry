import type { EnvironmentConfig } from './types.js';

export const devEnvironment: EnvironmentConfig = {
  name: 'dev',
  region: 'ap-south-1',
  githubOwner: 'CHANGE_ME',
  githubRepo: 'BusinessGenerator',
  natGateways: 1,
  isolatedDbSubnets: false,
  rds: {
    instanceSize: 'micro',
    multiAz: false,
    deletionProtection: false,
    backupRetentionDays: 1,
  },
  web: {
    cpu: 256,
    memoryMiB: 512,
    desiredCount: 1,
    minCount: 1,
    maxCount: 1,
  },
  worker: {
    cpu: 256,
    memoryMiB: 512,
    desiredCount: 1,
  },
  logRetentionDays: 7,
  monthlyBudgetUsd: 80,
  bedrockBearerTokenSecretName: 'foundry/dev/bedrock-bearer-token',
};
