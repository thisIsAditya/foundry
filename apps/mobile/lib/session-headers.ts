export function trpcHeaders(input: { cookie?: string; apiKey?: string }): Record<string, string> {
  if (input.apiKey !== undefined && input.apiKey.length > 0) {
    return { 'x-api-key': input.apiKey };
  }
  if (input.cookie !== undefined && input.cookie.length > 0) {
    return { Cookie: input.cookie };
  }
  return {};
}
