export const COFOUNDER_CANCEL_KEY_PREFIX = 'cofounder:cancel:';

export function cofounderCancelKey(operationId: string): string {
  return `${COFOUNDER_CANCEL_KEY_PREFIX}${operationId}`;
}
