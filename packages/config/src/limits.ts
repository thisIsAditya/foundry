export const limits = {
  maxUploadFileBytes: {
    document: 50 * 1024 * 1024,
    interviewRecording: 200 * 1024 * 1024,
  },
  maxPdfPagesParsed: 200,
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
  },
  idempotencyKeyTtlSeconds: 24 * 60 * 60,
  betterAuthSessionCookieCacheTtlSeconds: 5 * 60,
  mcp: {
    maxServersPerUser: 10,
    listToolsProbeTimeoutMs: 8_000,
    toolCallTimeoutMs: 30_000,
  },
} as const;
