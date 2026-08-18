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
  workerContainerName,
  workerLogGroupName,
  workerServiceName,
  workerTaskFamily,
} from './infra.js';

describe('infra constants', () => {
  it('matches the planned ports and ECR names (10 §3–4)', () => {
    expect(infra.webPort).toBe(3210);
    expect(infra.dbPort).toBe(5432);
    expect(infra.cachePort).toBe(6379);
    expect(infra.workerHealthPort).toBe(8689);
    expect(infra.vpcCidr).toBe('10.20.0.0/16');
    expect(infra.names.ecrWeb).toBe('foundry-web');
    expect(infra.names.ecrWorker).toBe('foundry-worker');
    expect(infra.queues.ingestion).toBe('ingestion');
    expect(infra.queues.sprint).toBe('sprint');
    expect(infra.queues.render).toBe('render');
    expect(infra.queues.notification).toBe('notification');
    expect(infra.ingestion.concurrency).toBe(8);
    expect(infra.sprintQueue.attempts).toBe(1);
    expect(infra.renderQueue.concurrency).toBe(4);
    expect(infra.renderQueue.attempts).toBe(3);
  });

  it('names ECS and SSM resources from the environment', () => {
    expect(clusterName('dev')).toBe('foundry-dev');
    expect(webServiceName('dev')).toBe('foundry-dev-web');
    expect(webTaskFamily('dev')).toBe('foundry-dev-web');
    expect(webContainerName()).toBe('web');
    expect(workerServiceName('dev')).toBe('foundry-dev-worker');
    expect(workerTaskFamily('dev')).toBe('foundry-dev-worker');
    expect(workerContainerName()).toBe('worker');
    expect(webLogGroupName('dev')).toBe('/foundry/dev/web');
    expect(workerLogGroupName('dev')).toBe('/foundry/dev/worker');
    expect(githubDeployRoleName('dev')).toBe('foundry-dev-github-deploy');
    expect(ssmPrefix('dev')).toBe('/foundry/dev');
  });
});
