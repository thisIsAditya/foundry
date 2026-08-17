import { infra, ssmPrefix } from '@foundry/config/infra';
import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

import type { EnvironmentName } from '../config/types.js';

export type EcrStackProps = cdk.StackProps & {
  environmentName: EnvironmentName;
};

export class EcrStack extends cdk.Stack {
  readonly webRepository: ecr.Repository;
  readonly workerRepository: ecr.Repository;

  constructor(scope: Construct, id: string, props: EcrStackProps) {
    super(scope, id, props);

    this.webRepository = this.createRepository('Web', infra.names.ecrWeb);
    this.workerRepository = this.createRepository('Worker', infra.names.ecrWorker);

    new ssm.StringParameter(this, 'WebRepoUri', {
      parameterName: `${ssmPrefix(props.environmentName)}/ecr-web-uri`,
      stringValue: this.webRepository.repositoryUri,
    });
    new ssm.StringParameter(this, 'WorkerRepoUri', {
      parameterName: `${ssmPrefix(props.environmentName)}/ecr-worker-uri`,
      stringValue: this.workerRepository.repositoryUri,
    });
  }

  private createRepository(id: string, name: string): ecr.Repository {
    const repository = new ecr.Repository(this, id, {
      repositoryName: name,
      imageScanOnPush: true,
      encryption: ecr.RepositoryEncryption.AES_256,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    repository.addLifecycleRule({
      description: 'Keep the last 20 tagged images',
      tagStatus: ecr.TagStatus.ANY,
      maxImageCount: 20,
    });
    repository.addLifecycleRule({
      description: 'Expire untagged images after 7 days',
      tagStatus: ecr.TagStatus.UNTAGGED,
      maxImageAge: cdk.Duration.days(7),
    });
    return repository;
  }
}
