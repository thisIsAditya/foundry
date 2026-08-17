import { ssmPrefix, webLogGroupName, workerLogGroupName } from '@foundry/config/infra';
import * as cdk from 'aws-cdk-lib';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import type * as rds from 'aws-cdk-lib/aws-rds';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

import type { EnvironmentConfig } from '../config/types.js';

export type ObservabilityStackProps = cdk.StackProps & {
  environment: EnvironmentConfig;
  dbInstance: rds.IDatabaseInstance;
};

export class ObservabilityStack extends cdk.Stack {
  readonly webLogGroup: logs.LogGroup;
  readonly workerLogGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);

    const envName = props.environment.name;
    const retention =
      props.environment.logRetentionDays === 30
        ? logs.RetentionDays.ONE_MONTH
        : logs.RetentionDays.ONE_WEEK;

    this.webLogGroup = new logs.LogGroup(this, 'WebLogs', {
      logGroupName: webLogGroupName(envName),
      retention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.workerLogGroup = new logs.LogGroup(this, 'WorkerLogs', {
      logGroupName: workerLogGroupName(envName),
      retention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new ssm.StringParameter(this, 'WebLogGroupName', {
      parameterName: `${ssmPrefix(envName)}/web-log-group`,
      stringValue: this.webLogGroup.logGroupName,
    });

    props.dbInstance
      .metricFreeStorageSpace({ period: cdk.Duration.minutes(5) })
      .createAlarm(this, 'RdsLowStorage', {
        threshold: 4 * 1024 * 1024 * 1024,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
        alarmDescription: 'RDS free storage below ~20% of the 20 GiB allocation (12 §5)',
      });

    props.dbInstance
      .metricCPUUtilization({ period: cdk.Duration.minutes(5) })
      .createAlarm(this, 'RdsCpuHigh', {
        threshold: 80,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        alarmDescription: 'RDS CPU above 80% for 10 minutes (12 §5)',
      });

    const budgetEmail = props.environment.budgetNotificationEmail;
    if (budgetEmail !== undefined) {
      new budgets.CfnBudget(this, 'MonthlySpend', {
        budget: {
          budgetName: `foundry-${envName}-monthly`,
          budgetType: 'COST',
          timeUnit: 'MONTHLY',
          budgetLimit: {
            amount: props.environment.monthlyBudgetUsd,
            unit: 'USD',
          },
        },
        notificationsWithSubscribers: [
          {
            notification: {
              comparisonOperator: 'GREATER_THAN',
              notificationType: 'ACTUAL',
              threshold: 110,
              thresholdType: 'PERCENTAGE',
            },
            subscribers: [{ address: budgetEmail, subscriptionType: 'EMAIL' }],
          },
        ],
      });
    }
  }
}
