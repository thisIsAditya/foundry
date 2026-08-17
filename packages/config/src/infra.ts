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
