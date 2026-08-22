export const infra = {
  webPort: 3210,
  dbPort: 5432,
  cachePort: 6379,
  workerHealthPort: 8689,
  vpcCidr: '10.20.0.0/16',
  names: {
    ecrWeb: 'foundry-web',
    ecrWorker: 'foundry-worker',
    ecrHarness: 'foundry-harness',
  },
  queues: {
    ingestion: 'ingestion',
    cofounder: 'cofounder',
    render: 'render',
    notification: 'notification',
  },
  ingestion: {
    concurrency: 8,
    attempts: 3,
    backoffMs: 5_000,
  },
  cofounderQueue: {
    concurrency: 4,
    attempts: 3,
    backoffMs: 5_000,
    lockDurationMs: 5 * 60_000,
  },
  renderQueue: {
    concurrency: 4,
    attempts: 3,
    backoffMs: 5_000,
  },
  notificationQueue: {
    concurrency: 8,
    attempts: 3,
    backoffMs: 5_000,
  },
  stream: {
    channelPrefix: 'stream:',
    logPrefix: 'stream-log:',
    seqPrefix: 'stream-seq:',
  },
} as const;

export function clusterName(environment: string): string {
  return `foundry-${environment}`;
}

export function webServiceName(environment: string): string {
  return `foundry-${environment}-web`;
}

export function webTaskFamily(environment: string): string {
  return `foundry-${environment}-web`;
}

export function webContainerName(): string {
  return 'web';
}

export function workerServiceName(environment: string): string {
  return `foundry-${environment}-worker`;
}

export function workerTaskFamily(environment: string): string {
  return `foundry-${environment}-worker`;
}

export function workerContainerName(): string {
  return 'worker';
}

export function harnessContainerName(): string {
  return 'harness';
}

export function webLogGroupName(environment: string): string {
  return `/foundry/${environment}/web`;
}

export function workerLogGroupName(environment: string): string {
  return `/foundry/${environment}/worker`;
}

export function githubDeployRoleName(environment: string): string {
  return `foundry-${environment}-github-deploy`;
}

export function ssmPrefix(environment: string): string {
  return `/foundry/${environment}`;
}
