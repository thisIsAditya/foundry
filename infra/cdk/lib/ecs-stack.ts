import {
  clusterName,
  infra,
  harnessContainerName,
  ssmPrefix,
  webContainerName,
  webServiceName,
  webTaskFamily,
  workerContainerName,
  workerServiceName,
  workerTaskFamily,
} from '@foundry/config/infra';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import type * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

import type { EnvironmentConfig } from '../config/types.js';
import type { DataStack } from './data-stack.js';
import type { EcrStack } from './ecr-stack.js';
import type { NetworkStack } from './network-stack.js';

export type EcsStackProps = cdk.StackProps & {
  environment: EnvironmentConfig;
  network: NetworkStack;
  data: DataStack;
  ecr: EcrStack;
  webLogGroup: logs.ILogGroup;
  workerLogGroup: logs.ILogGroup;
  imageTag: string;
};

export class EcsStack extends cdk.Stack {
  readonly cluster: ecs.Cluster;
  readonly webService: ecs.FargateService;
  readonly workerService: ecs.FargateService;
  readonly alb: elbv2.ApplicationLoadBalancer;
  readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const { environment, network, data, ecr } = props;
    const envName = environment.name;
    const bedrockBearerToken = secretsmanager.Secret.fromSecretNameV2(
      this,
      'BedrockBearerToken',
      environment.bedrockBearerTokenSecretName,
    );

    this.cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: clusterName(envName),
      vpc: network.vpc,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    this.alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc: network.vpc,
      internetFacing: true,
      securityGroup: network.albSg,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      idleTimeout: cdk.Duration.seconds(130),
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'WebTargets', {
      vpc: network.vpc,
      port: infra.webPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      deregistrationDelay: cdk.Duration.seconds(30),
      healthCheck: {
        path: '/api/ready',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        healthyHttpCodes: '200',
      },
    });

    this.alb.addListener('Http', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [targetGroup],
    });

    const origin = new origins.LoadBalancerV2Origin(this.alb, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
      httpPort: 80,
      readTimeout: cdk.Duration.seconds(60),
      keepaliveTimeout: cdk.Duration.seconds(60),
    });

    const nextStaticCache = new cloudfront.CachePolicy(this, 'NextStaticCache', {
      defaultTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const publicCache = new cloudfront.CachePolicy(this, 'PublicCache', {
      defaultTtl: cdk.Duration.days(1),
      minTtl: cdk.Duration.days(1),
      maxTtl: cdk.Duration.days(1),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const originRequests = cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER;

    this.distribution = new cloudfront.Distribution(this, 'Cdn', {
      comment: `foundry ${envName}`,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      defaultBehavior: {
        origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: originRequests,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      },
      additionalBehaviors: {
        '/_next/static/*': {
          origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: nextStaticCache,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          compress: true,
        },
        '/public/*': {
          origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: publicCache,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          compress: true,
        },
        '/api/stream/*': {
          origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: originRequests,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
      },
    });

    const taskRole = new iam.Role(this, 'WebTaskRole', {
      roleName: `foundry-${envName}-web-task`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    const executionRole = new iam.Role(this, 'WebExecutionRole', {
      roleName: `foundry-${envName}-web-execution`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    executionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
    );

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'WebTask', {
      family: webTaskFamily(envName),
      cpu: environment.web.cpu,
      memoryLimitMiB: environment.web.memoryMiB,
      taskRole,
      executionRole,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    data.uploadsBucket.grantReadWrite(taskDefinition.taskRole);
    data.artifactsBucket.grantReadWrite(taskDefinition.taskRole);

    taskDefinition.addContainer(webContainerName(), {
      image: ecs.ContainerImage.fromEcrRepository(ecr.webRepository, props.imageTag),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'web',
        logGroup: props.webLogGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        HOSTNAME: '0.0.0.0',
        PORT: String(infra.webPort),
        BETTER_AUTH_URL: `https://${this.distribution.distributionDomainName}`,
        REDIS_HOST: data.cacheEndpointAddress,
        REDIS_PORT: data.cacheEndpointPort,
        AWS_REGION: this.region,
        AWS_S3_UPLOADS_BUCKET: data.uploadsBucket.bucketName,
        AWS_S3_ARTIFACTS_BUCKET: data.artifactsBucket.bucketName,
      },
      secrets: {
        RDS_SECRET: ecs.Secret.fromSecretsManager(data.dbSecret),
        BETTER_AUTH_SECRET: ecs.Secret.fromSecretsManager(data.betterAuthSecret),
      },
      portMappings: [{ containerPort: infra.webPort }],
      stopTimeout: cdk.Duration.seconds(30),
      healthCheck: {
        command: [
          'CMD-SHELL',
          `node -e "fetch('http://127.0.0.1:${infra.webPort}/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"`,
        ],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(40),
      },
    });

    this.webService = new ecs.FargateService(this, 'WebService', {
      serviceName: webServiceName(envName),
      cluster: this.cluster,
      taskDefinition,
      desiredCount: environment.web.desiredCount,
      assignPublicIp: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [network.webTaskSg],
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      circuitBreaker: { rollback: true },
      enableExecuteCommand: false,
    });
    this.webService.attachToApplicationTargetGroup(targetGroup);

    const workerTaskRole = new iam.Role(this, 'WorkerTaskRole', {
      roleName: `foundry-${envName}-worker-task`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    const workerExecutionRole = new iam.Role(this, 'WorkerExecutionRole', {
      roleName: `foundry-${envName}-worker-execution`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    workerExecutionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
    );

    const workerTaskDefinition = new ecs.FargateTaskDefinition(this, 'WorkerTask', {
      family: workerTaskFamily(envName),
      cpu: environment.worker.cpu,
      memoryLimitMiB: environment.worker.memoryMiB,
      taskRole: workerTaskRole,
      executionRole: workerExecutionRole,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    data.uploadsBucket.grantReadWrite(workerTaskDefinition.taskRole);
    data.artifactsBucket.grantReadWrite(workerTaskDefinition.taskRole);
    workerTaskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: ['*'],
      }),
    );

    const harness = workerTaskDefinition.addContainer(harnessContainerName(), {
      image: ecs.ContainerImage.fromEcrRepository(ecr.harnessRepository, props.imageTag),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'harness',
        logGroup: props.workerLogGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '8787',
        DSH_MODEL: 'openai.gpt-5.6-luna',
        AWS_REGION: this.region,
      },
      secrets: {
        HARNESS_ADAPTER_TOKEN: ecs.Secret.fromSecretsManager(data.harnessToken),
        AWS_BEARER_TOKEN_BEDROCK: ecs.Secret.fromSecretsManager(bedrockBearerToken),
      },
      healthCheck: {
        command: [
          'CMD-SHELL',
          'node -e "fetch(\'http://127.0.0.1:8787/healthz\').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"',
        ],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(40),
      },
    });

    const workerContainer = workerTaskDefinition.addContainer(workerContainerName(), {
      image: ecs.ContainerImage.fromEcrRepository(ecr.workerRepository, props.imageTag),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'worker',
        logGroup: props.workerLogGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        HOSTNAME: '0.0.0.0',
        PORT: String(infra.workerHealthPort),
        REDIS_HOST: data.cacheEndpointAddress,
        REDIS_PORT: data.cacheEndpointPort,
        AWS_REGION: this.region,
        AWS_S3_UPLOADS_BUCKET: data.uploadsBucket.bucketName,
        AWS_S3_ARTIFACTS_BUCKET: data.artifactsBucket.bucketName,
        FOUNDRY_HARNESS_URL: 'http://127.0.0.1:8787',
      },
      secrets: {
        RDS_SECRET: ecs.Secret.fromSecretsManager(data.dbSecret),
        FOUNDRY_HARNESS_TOKEN: ecs.Secret.fromSecretsManager(data.harnessToken),
      },
      portMappings: [{ containerPort: infra.workerHealthPort }],
      stopTimeout: cdk.Duration.seconds(120),
      healthCheck: {
        command: [
          'CMD-SHELL',
          `node -e "fetch('http://127.0.0.1:${infra.workerHealthPort}/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"`,
        ],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(40),
      },
    });
    workerContainer.addContainerDependencies({
      container: harness,
      condition: ecs.ContainerDependencyCondition.HEALTHY,
    });

    this.workerService = new ecs.FargateService(this, 'WorkerService', {
      serviceName: workerServiceName(envName),
      cluster: this.cluster,
      taskDefinition: workerTaskDefinition,
      desiredCount: environment.worker.desiredCount,
      assignPublicIp: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [network.workerTaskSg],
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      circuitBreaker: { rollback: true },
      enableExecuteCommand: false,
    });

    this.webService
      .metricCpuUtilization({ period: cdk.Duration.minutes(5) })
      .createAlarm(this, 'WebCpuHigh', {
        threshold: 80,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        alarmDescription: 'web CPU above 80% for 10 minutes (12 §5)',
      });
    this.webService
      .metricMemoryUtilization({ period: cdk.Duration.minutes(5) })
      .createAlarm(this, 'WebMemoryHigh', {
        threshold: 80,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        alarmDescription: 'web memory above 80% for 10 minutes',
      });

    const errors = targetGroup.metrics.httpCodeTarget(elbv2.HttpCodeTarget.TARGET_5XX_COUNT, {
      period: cdk.Duration.minutes(5),
    });
    const requests = targetGroup.metrics.requestCount({ period: cdk.Duration.minutes(5) });
    new cloudwatch.MathExpression({
      expression: 'IF(requests > 10, 100 * errors / requests, 0)',
      usingMetrics: { errors, requests },
      period: cdk.Duration.minutes(5),
    }).createAlarm(this, 'Web5xxRate', {
      threshold: 2,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: 'web target 5xx rate above 2% over 5 minutes (12 §5)',
    });

    this.workerService
      .metricCpuUtilization({ period: cdk.Duration.minutes(5) })
      .createAlarm(this, 'WorkerCpuHigh', {
        threshold: 80,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        alarmDescription: 'worker CPU above 80% for 10 minutes (12 §5)',
      });
    this.workerService
      .metricMemoryUtilization({ period: cdk.Duration.minutes(5) })
      .createAlarm(this, 'WorkerMemoryHigh', {
        threshold: 80,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        alarmDescription: 'worker memory above 80% for 10 minutes',
      });

    const prefix = ssmPrefix(envName);
    new ssm.StringParameter(this, 'ClusterNameParam', {
      parameterName: `${prefix}/ecs-cluster-name`,
      stringValue: this.cluster.clusterName,
    });
    new ssm.StringParameter(this, 'WebServiceNameParam', {
      parameterName: `${prefix}/web-service-name`,
      stringValue: this.webService.serviceName,
    });
    new ssm.StringParameter(this, 'WebTaskFamilyParam', {
      parameterName: `${prefix}/web-task-family`,
      stringValue: taskDefinition.family,
    });
    new ssm.StringParameter(this, 'WebContainerNameParam', {
      parameterName: `${prefix}/web-container-name`,
      stringValue: webContainerName(),
    });
    new ssm.StringParameter(this, 'WorkerServiceNameParam', {
      parameterName: `${prefix}/worker-service-name`,
      stringValue: this.workerService.serviceName,
    });
    new ssm.StringParameter(this, 'WorkerTaskFamilyParam', {
      parameterName: `${prefix}/worker-task-family`,
      stringValue: workerTaskDefinition.family,
    });
    new ssm.StringParameter(this, 'WorkerContainerNameParam', {
      parameterName: `${prefix}/worker-container-name`,
      stringValue: workerContainerName(),
    });
    new ssm.StringParameter(this, 'CloudFrontDomainParam', {
      parameterName: `${prefix}/cloudfront-domain`,
      stringValue: this.distribution.distributionDomainName,
    });
  }
}
