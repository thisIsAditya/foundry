export function errorMessageOf(error: unknown): string | null {
  return error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : null;
}
