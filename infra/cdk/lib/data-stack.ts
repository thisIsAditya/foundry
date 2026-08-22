import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';

import type { EnvironmentConfig, RdsInstanceSize } from '../config/types.js';
import type { NetworkStack } from './network-stack.js';

export type DataStackProps = cdk.StackProps & {
  environment: EnvironmentConfig;
  network: NetworkStack;
};

function rdsInstanceType(size: RdsInstanceSize): ec2.InstanceType {
  const instanceSize = size === 'small' ? ec2.InstanceSize.SMALL : ec2.InstanceSize.MICRO;
  return ec2.InstanceType.of(ec2.InstanceClass.T4G, instanceSize);
}

export class DataStack extends cdk.Stack {
  readonly dbInstance: rds.DatabaseInstance;
  readonly dbSecret: secretsmanager.ISecret;
  readonly cache: elasticache.CfnServerlessCache;
  readonly uploadsBucket: s3.Bucket;
  readonly artifactsBucket: s3.Bucket;
  readonly betterAuthSecret: secretsmanager.Secret;
  readonly harnessToken: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const { environment, network } = props;
    const dbSubnetType = environment.isolatedDbSubnets
      ? ec2.SubnetType.PRIVATE_ISOLATED
      : ec2.SubnetType.PRIVATE_WITH_EGRESS;
    const dbSubnets = network.vpc.selectSubnets({ subnetType: dbSubnetType });

    this.dbInstance = new rds.DatabaseInstance(this, 'Postgres', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_17,
      }),
      instanceType: rdsInstanceType(environment.rds.instanceSize),
      vpc: network.vpc,
      vpcSubnets: { subnetType: dbSubnetType },
      securityGroups: [network.dbSg],
      databaseName: 'foundry',
      credentials: rds.Credentials.fromGeneratedSecret('foundry', {
        secretName: `foundry/${environment.name}/rds`,
      }),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      multiAz: environment.rds.multiAz,
      publiclyAccessible: false,
      deletionProtection: environment.rds.deletionProtection,
      backupRetention: cdk.Duration.days(environment.rds.backupRetentionDays),
      removalPolicy: environment.rds.deletionProtection
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      cloudwatchLogsExports: ['postgresql'],
    });
    if (this.dbInstance.secret === undefined) {
      throw new Error('RDS generated a database without a Secrets Manager secret');
    }
    this.dbSecret = this.dbInstance.secret;

    this.cache = new elasticache.CfnServerlessCache(this, 'Valkey', {
      engine: 'valkey',
      serverlessCacheName: `foundry-${environment.name}-valkey`,
      majorEngineVersion: '8',
      description: 'Shared Valkey for coordination and (later) queues',
      securityGroupIds: [network.cacheSg.securityGroupId],
      subnetIds: dbSubnets.subnetIds,
    });

    const abortIncomplete: s3.LifecycleRule = {
      abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
    };

    this.uploadsBucket = new s3.Bucket(this, 'Uploads', {
      bucketName: `foundry-${environment.name}-uploads-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !environment.rds.deletionProtection,
      lifecycleRules: [abortIncomplete],
    });

    this.artifactsBucket = new s3.Bucket(this, 'Artifacts', {
      bucketName: `foundry-${environment.name}-artifacts-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !environment.rds.deletionProtection,
      lifecycleRules: [abortIncomplete],
    });

    this.betterAuthSecret = new secretsmanager.Secret(this, 'BetterAuthSecret', {
      secretName: `foundry/${environment.name}/better-auth-secret`,
      generateSecretString: {
        passwordLength: 64,
        excludePunctuation: true,
      },
    });
    this.harnessToken = new secretsmanager.Secret(this, 'HarnessToken', {
      secretName: `foundry/${environment.name}/harness-token`,
      generateSecretString: {
        passwordLength: 64,
        excludePunctuation: true,
      },
    });
  }

  get cacheEndpointAddress(): string {
    return this.cache.attrEndpointAddress;
  }

  get cacheEndpointPort(): string {
    return this.cache.attrEndpointPort;
  }
}
