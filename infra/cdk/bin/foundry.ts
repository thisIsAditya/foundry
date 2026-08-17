import * as cdk from 'aws-cdk-lib';

import { devEnvironment } from '../config/dev.js';
import { CiStack } from '../lib/ci-stack.js';
import { DataStack } from '../lib/data-stack.js';
import { EcrStack } from '../lib/ecr-stack.js';
import { EcsStack } from '../lib/ecs-stack.js';
import { getCdkAccount } from '../lib/env.js';
import { NetworkStack } from '../lib/network-stack.js';
import { ObservabilityStack } from '../lib/observability-stack.js';

const app = new cdk.App();
const requested = String(app.node.tryGetContext('env') ?? 'dev');
if (requested !== 'dev') {
  throw new Error(`Milestone 3 only synthesizes env=dev (got ${requested}).`);
}

const account = getCdkAccount() ?? '000000000000';
const githubOwner = String(app.node.tryGetContext('githubOwner') ?? devEnvironment.githubOwner);
const githubRepo = String(app.node.tryGetContext('githubRepo') ?? devEnvironment.githubRepo);
const imageTag = String(app.node.tryGetContext('webImageTag') ?? 'latest');

const environment = {
  ...devEnvironment,
  account,
  githubOwner,
  githubRepo,
};

const env = { account, region: environment.region };

cdk.Tags.of(app).add('Project', 'foundry');
cdk.Tags.of(app).add('Environment', environment.name);

const network = new NetworkStack(app, 'Foundry-Dev-Network', {
  env,
  environmentName: environment.name,
  natGateways: environment.natGateways,
  isolatedDbSubnets: environment.isolatedDbSubnets,
});

const data = new DataStack(app, 'Foundry-Dev-Data', {
  env,
  environment,
  network,
});

const ecr = new EcrStack(app, 'Foundry-Dev-Ecr', {
  env,
  environmentName: environment.name,
});

const observability = new ObservabilityStack(app, 'Foundry-Dev-Observability', {
  env,
  environment,
  dbInstance: data.dbInstance,
});

new CiStack(app, 'Foundry-Dev-Ci', {
  env,
  environment,
  ecr,
});

new EcsStack(app, 'Foundry-Dev-Ecs', {
  env,
  environment,
  network,
  data,
  ecr,
  webLogGroup: observability.webLogGroup,
  imageTag,
});
