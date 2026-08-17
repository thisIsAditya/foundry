export type EnvironmentName = 'dev' | 'staging' | 'production';

export type RdsInstanceSize = 'micro' | 'small';

export type EnvironmentConfig = {
  name: EnvironmentName;
  region: string;
  account?: string;
  githubOwner: string;
  githubRepo: string;
  natGateways: number;
  isolatedDbSubnets: boolean;
  rds: {
    instanceSize: RdsInstanceSize;
    multiAz: boolean;
    deletionProtection: boolean;
    backupRetentionDays: number;
  };
  web: {
    cpu: number;
    memoryMiB: number;
    desiredCount: number;
    minCount: number;
    maxCount: number;
  };
  worker: {
    cpu: number;
    memoryMiB: number;
    desiredCount: number;
  };
  logRetentionDays: 7 | 30;
  monthlyBudgetUsd: number;
  budgetNotificationEmail?: string;
};
