export const infra = {
  webPort: 3000,
  dbPort: 5432,
  cachePort: 6379,
  workerHealthPort: 8080,
  vpcCidr: '10.20.0.0/16',
  names: {
    ecrWeb: 'foundry-web',
    ecrWorker: 'foundry-worker',
  },
  queues: {
    ingestion: 'ingestion',
    sprint: 'sprint',
  },
  ingestion: {
    concurrency: 8,
    attempts: 3,
    backoffMs: 5_000,
  },
  sprintQueue: {
    concurrency: 4,
    attempts: 1,
    lockDurationMs: 5 * 60_000,
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
