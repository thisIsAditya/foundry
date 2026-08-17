export type IngestionRejectReason =
  'malware_detected' | 'mime_mismatch' | 'too_large' | 'parse_failed' | 'page_limit';

export class IngestionRejectError extends Error {
  readonly reason: IngestionRejectReason;

  constructor(reason: IngestionRejectReason, message: string) {
    super(message);
    this.name = 'IngestionRejectError';
    this.reason = reason;
  }
}

export function isIngestionRejectError(error: unknown): error is IngestionRejectError {
  return error instanceof IngestionRejectError;
}
