import { describe, expect, it } from 'vitest';

import {
  clusterName,
  githubDeployRoleName,
  infra,
  ssmPrefix,
  webContainerName,
  webLogGroupName,
  webServiceName,
  webTaskFamily,
  workerLogGroupName,
} from './infra.js';

describe('infra constants', () => {
  it('matches the planned ports and ECR names (10 §3–4)', () => {
    expect(infra.webPort).toBe(3000);
    expect(infra.dbPort).toBe(5432);
    expect(infra.cachePort).toBe(6379);
    expect(infra.vpcCidr).toBe('10.20.0.0/16');
    expect(infra.names.ecrWeb).toBe('foundry-web');
    expect(infra.names.ecrWorker).toBe('foundry-worker');
  });

  it('names ECS and SSM resources from the environment', () => {
    expect(clusterName('dev')).toBe('foundry-dev');
    expect(webServiceName('dev')).toBe('foundry-dev-web');
    expect(webTaskFamily('dev')).toBe('foundry-dev-web');
    expect(webContainerName()).toBe('web');
    expect(webLogGroupName('dev')).toBe('/foundry/dev/web');
    expect(workerLogGroupName('dev')).toBe('/foundry/dev/worker');
    expect(githubDeployRoleName('dev')).toBe('foundry-dev-github-deploy');
    expect(ssmPrefix('dev')).toBe('/foundry/dev');
  });
});
