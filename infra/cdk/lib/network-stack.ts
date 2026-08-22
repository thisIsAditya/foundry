import { infra, ssmPrefix } from '@foundry/config/infra';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

import type { EnvironmentName } from '../config/types.js';

export type NetworkStackProps = cdk.StackProps & {
  environmentName: EnvironmentName;
  natGateways: number;
  isolatedDbSubnets: boolean;
};

export class NetworkStack extends cdk.Stack {
  readonly vpc: ec2.Vpc;
  readonly albSg: ec2.SecurityGroup;
  readonly webTaskSg: ec2.SecurityGroup;
  readonly workerTaskSg: ec2.SecurityGroup;
  readonly dbSg: ec2.SecurityGroup;
  readonly cacheSg: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    const subnetConfiguration: ec2.SubnetConfiguration[] = [
      { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
      { name: 'private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
    ];
    if (props.isolatedDbSubnets) {
      subnetConfiguration.push({
        name: 'isolated',
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        cidrMask: 24,
      });
    }

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr(infra.vpcCidr),
      maxAzs: 2,
      natGateways: props.natGateways,
      subnetConfiguration,
    });

    this.albSg = new ec2.SecurityGroup(this, 'AlbSg', {
      vpc: this.vpc,
      description: 'ALB',
      allowAllOutbound: true,
    });
    // HTTP:80 until ACM exists (plan/11 I2). CloudFront is the public HTTPS front door (10 §6).
    this.albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'CloudFront origin HTTP');

    this.webTaskSg = new ec2.SecurityGroup(this, 'WebTaskSg', {
      vpc: this.vpc,
      description: 'web Fargate tasks',
      allowAllOutbound: true,
    });
    this.webTaskSg.addIngressRule(this.albSg, ec2.Port.tcp(infra.webPort), 'ALB to web');

    this.workerTaskSg = new ec2.SecurityGroup(this, 'WorkerTaskSg', {
      vpc: this.vpc,
      description: 'worker Fargate tasks (Milestone 4)',
      allowAllOutbound: true,
    });
    // Co-founder capability calls: worker reaches web directly over the private
    // Cloud Map service discovery DNS name, never through the public CloudFront/ALB path.
    this.webTaskSg.addIngressRule(
      this.workerTaskSg,
      ec2.Port.tcp(infra.webPort),
      'worker to web (capability invoke)',
    );

    this.dbSg = new ec2.SecurityGroup(this, 'DbSg', {
      vpc: this.vpc,
      description: 'RDS PostgreSQL',
      allowAllOutbound: false,
    });
    this.dbSg.addIngressRule(this.webTaskSg, ec2.Port.tcp(infra.dbPort), 'web to db');
    this.dbSg.addIngressRule(this.workerTaskSg, ec2.Port.tcp(infra.dbPort), 'worker to db');

    this.cacheSg = new ec2.SecurityGroup(this, 'CacheSg', {
      vpc: this.vpc,
      description: 'ElastiCache Serverless',
      allowAllOutbound: false,
    });
    this.cacheSg.addIngressRule(this.webTaskSg, ec2.Port.tcp(infra.cachePort), 'web to cache');
    this.cacheSg.addIngressRule(
      this.workerTaskSg,
      ec2.Port.tcp(infra.cachePort),
      'worker to cache',
    );

    this.vpc.addGatewayEndpoint('S3', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    const endpointSg = new ec2.SecurityGroup(this, 'EndpointSg', {
      vpc: this.vpc,
      description: 'Interface VPC endpoints',
      allowAllOutbound: true,
    });
    endpointSg.addIngressRule(
      ec2.Peer.ipv4(infra.vpcCidr),
      ec2.Port.tcp(443),
      'VPC HTTPS to interface endpoints',
    );

    const interfaceServices = [
      { id: 'SecretsManager', service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER },
      { id: 'Ecr', service: ec2.InterfaceVpcEndpointAwsService.ECR },
      { id: 'EcrDocker', service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER },
      { id: 'Logs', service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS },
      { id: 'Kms', service: ec2.InterfaceVpcEndpointAwsService.KMS },
    ];
    for (const endpoint of interfaceServices) {
      this.vpc.addInterfaceEndpoint(endpoint.id, {
        service: endpoint.service,
        securityGroups: [endpointSg],
        privateDnsEnabled: true,
      });
    }

    const privateSubnets = this.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    });
    new ssm.StringParameter(this, 'PrivateSubnetIds', {
      parameterName: `${ssmPrefix(props.environmentName)}/private-subnet-ids`,
      stringValue: cdk.Fn.join(',', privateSubnets.subnetIds),
    });
    new ssm.StringParameter(this, 'WebTaskSgId', {
      parameterName: `${ssmPrefix(props.environmentName)}/web-task-sg-id`,
      stringValue: this.webTaskSg.securityGroupId,
    });
    new ssm.StringParameter(this, 'WorkerTaskSgId', {
      parameterName: `${ssmPrefix(props.environmentName)}/worker-task-sg-id`,
      stringValue: this.workerTaskSg.securityGroupId,
    });
  }
}
