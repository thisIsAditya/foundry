import {
  clusterName,
  githubDeployRoleName,
  ssmPrefix,
  webServiceName,
  webTaskFamily,
} from '@foundry/config/infra';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

import type { EnvironmentConfig } from '../config/types.js';
import type { EcrStack } from './ecr-stack.js';

export type CiStackProps = cdk.StackProps & {
  environment: EnvironmentConfig;
  ecr: EcrStack;
};

export class CiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CiStackProps) {
    super(scope, id, props);

    const { environment, ecr } = props;
    const envName = environment.name;
    const provider = new iam.OpenIdConnectProvider(this, 'GitHubOidc', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    const deployRole = new iam.Role(this, 'GitHubDeploy', {
      roleName: githubDeployRoleName(envName),
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:${environment.githubOwner}/${environment.githubRepo}:ref:refs/heads/main`,
        },
      }),
      description: 'GitHub Actions deploy-dev.yml: ECR push, migrate RunTask, ECS update (10 s9)',
    });

    ecr.webRepository.grantPullPush(deployRole);
    ecr.workerRepository.grantPullPush(deployRole);

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'EcrAuth',
        actions: ['ecr:GetAuthorizationToken'],
        resources: ['*'],
      }),
    );

    const clusterArn = `arn:aws:ecs:${this.region}:${this.account}:cluster/${clusterName(envName)}`;
    const serviceArn = `arn:aws:ecs:${this.region}:${this.account}:service/${clusterName(envName)}/${webServiceName(envName)}`;
    const taskDefArn = `arn:aws:ecs:${this.region}:${this.account}:task-definition/${webTaskFamily(envName)}:*`;
    const taskArn = `arn:aws:ecs:${this.region}:${this.account}:task/${clusterName(envName)}/*`;

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'EcsMutate',
        actions: [
          'ecs:DescribeClusters',
          'ecs:DescribeServices',
          'ecs:DescribeTasks',
          'ecs:ListTasks',
          'ecs:UpdateService',
          'ecs:RunTask',
          'ecs:StopTask',
          'ecs:TagResource',
        ],
        resources: [clusterArn, serviceArn, taskDefArn, taskArn],
      }),
    );

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'EcsTaskDefinitions',
        actions: ['ecs:DescribeTaskDefinition', 'ecs:RegisterTaskDefinition'],
        resources: ['*'],
      }),
    );

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'PassTaskRoles',
        actions: ['iam:PassRole'],
        resources: [
          `arn:aws:iam::${this.account}:role/foundry-${envName}-web-task`,
          `arn:aws:iam::${this.account}:role/foundry-${envName}-web-execution`,
        ],
        conditions: {
          StringEquals: { 'iam:PassedToService': 'ecs-tasks.amazonaws.com' },
        },
      }),
    );

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'ReadDeployParams',
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter${ssmPrefix(envName)}/*`],
      }),
    );

    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'ReadMigrateLogs',
        actions: ['logs:GetLogEvents', 'logs:FilterLogEvents', 'logs:DescribeLogStreams'],
        resources: [
          `arn:aws:logs:${this.region}:${this.account}:log-group:/foundry/${envName}/*`,
          `arn:aws:logs:${this.region}:${this.account}:log-group:/foundry/${envName}/*:log-stream:*`,
        ],
      }),
    );
  }
}
