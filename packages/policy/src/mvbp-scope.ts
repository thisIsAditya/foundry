import { limits } from '@foundry/config/limits';

export type MvbpScopeInput = {
  hypothesis: string;
  featureCount: number;
  paymentPath: string | null;
};

export type MvbpScopeCheck = {
  id: string;
  passed: boolean;
  detail: string;
};

export type MvbpScopeEvaluation = {
  result: 'passed' | 'failed';
  checks: MvbpScopeCheck[];
};

export function evaluateMvbpScope(input: MvbpScopeInput): MvbpScopeEvaluation {
  const hypothesis = input.hypothesis.trim();
  const paymentPath = input.paymentPath?.trim() ?? '';
  const checks: MvbpScopeCheck[] = [
    {
      id: 'hypothesis',
      passed: hypothesis.length > 0,
      detail:
        hypothesis.length > 0 ? 'Hypothesis is present' : 'MVBP requires a testable hypothesis',
    },
    {
      id: 'feature_count',
      passed: input.featureCount <= limits.mvbp.maxFeaturesWithoutWaiver,
      detail:
        input.featureCount <= limits.mvbp.maxFeaturesWithoutWaiver
          ? `${input.featureCount} features is within the kill-line`
          : `${input.featureCount} features exceeds ${limits.mvbp.maxFeaturesWithoutWaiver} without a waiver`,
    },
    {
      id: 'payment_path',
      passed: paymentPath.length > 0,
      detail: paymentPath.length > 0 ? 'Payment path is present' : 'MVBP requires a payment path',
    },
  ];
  return {
    result: checks.every((check) => check.passed) ? 'passed' : 'failed',
    checks,
  };
}
