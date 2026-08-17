export const limits = {
  maxUploadFileBytes: {
    document: 50 * 1024 * 1024,
    interviewRecording: 200 * 1024 * 1024,
  },
  allowedDocumentMimeTypes: ['application/pdf', 'text/plain', 'text/markdown'] as const,
  maxPdfPagesParsed: 200,
  uploadIntentTtlSeconds: 60 * 60,
  uploadUrlExpiresSeconds: 60 * 60,
  codeMode: {
    maxExecutionMs: 5_000,
    maxMemoryBytes: 64 * 1024 * 1024,
    maxSourceBytes: 20 * 1024,
    maxResultBytes: 256 * 1024,
  },
  sprint: {
    defaultMaxWorkers: 3,
    hardMaxWorkers: 5,
    maxDurationMs: 45 * 60 * 1000,
    defaultBudgetUsdWithoutApproval: 2,
  },
  rateLimit: {
    trpcReadPerMinute: 60,
    trpcMutationPerMinute: 20,
    adminApiKeyPerMinute: 30,
    verifyAccessKeyPerMinute: 5,
  },
  idempotencyKeyTtlSeconds: 24 * 60 * 60,
  betterAuthSessionCookieCacheTtlSeconds: 5 * 60,
  mcp: {
    maxServersPerUser: 10,
    listToolsProbeTimeoutMs: 8_000,
    toolCallTimeoutMs: 30_000,
  },
} as const;
