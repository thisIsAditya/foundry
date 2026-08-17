import type { FounderTask } from '@foundry/domain';

export type CaptureKind = 'interview' | 'wtp' | 'observation';

export function primaryCaptureKind(task: FounderTask): CaptureKind {
  const blob =
    `${task.title}\n${task.explanation}\n${task.evidenceSchema.description}`.toLowerCase();
  if (blob.includes('interview') || blob.includes('quote')) {
    return 'interview';
  }
  if (
    task.linkedScoreDimensions.includes('willingness_to_pay') ||
    blob.includes('pay') ||
    blob.includes('preorder') ||
    blob.includes('deposit')
  ) {
    return 'wtp';
  }
  return 'observation';
}

export function captureHref(kind: CaptureKind, founderTaskId: string): string {
  return `/(app)/capture/${kind}?founderTaskId=${founderTaskId}`;
}
