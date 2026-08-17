export const AppErrorCodes = [
  'unauthorized',
  'not_found',
  'stale_revision',
  'invalid_input',
  'missing_evidence',
  'gate_blocked',
  'approval_required',
  'provider_unavailable',
  'capability_unsupported',
  'budget_exceeded',
  'rate_limited',
  'document_rejected',
  'artifact_render_failed',
  'policy_forbidden',
  'workflow_paused',
  'workflow_failed',
  'deletion_pending',
] as const;

export type AppErrorCode = (typeof AppErrorCodes)[number];

export type AppErrorInit = {
  code: AppErrorCode;
  explanation: string;
  nextAction: string;
  retryable?: boolean;
  correlationId?: string;
  cause?: unknown;
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly explanation: string;
  readonly retryable: boolean;
  readonly nextAction: string;
  readonly correlationId: string | undefined;

  constructor(init: AppErrorInit) {
    super(init.explanation, { cause: init.cause });
    this.name = 'AppError';
    this.code = init.code;
    this.explanation = init.explanation;
    this.retryable = init.retryable ?? false;
    this.nextAction = init.nextAction;
    this.correlationId = init.correlationId;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
