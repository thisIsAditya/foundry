import type { FounderTask } from '@foundry/domain';

export const NEEDS_YOU_TASK_STATUSES = new Set(['proposed', 'active', 'deferred']);

export function taskPriority(task: FounderTask): number {
  return task.status === 'deferred' ? 2 : 0;
}

export function topWaitingFounderTask(tasks: readonly FounderTask[]): FounderTask | undefined {
  return [...tasks]
    .filter((task) => NEEDS_YOU_TASK_STATUSES.has(task.status))
    .sort((a, b) => taskPriority(a) - taskPriority(b))[0];
}
