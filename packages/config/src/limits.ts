export const limits = {
  maxUploadFileBytes: {
    document: 50 * 1024 * 1024,
    interviewRecording: 200 * 1024 * 1024,
  },
  allowedDocumentMimeTypes: ['application/pdf', 'text/plain', 'text/markdown'] as const,
  allowedAudioMimeTypes: ['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac'] as const,
  maxPdfPagesParsed: 200,
  uploadIntentTtlSeconds: 60 * 60,
  uploadUrlExpiresSeconds: 60 * 60,
  downloadUrlExpiresSeconds: 15 * 60,
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
    defaultMaxStalls: 2,
    defaultMaxRounds: 3,
  },
  interactive: {
    diagnoseTimeoutMs: 15_000,
    // Local models (Ollama) can take much longer than a hosted API to load and generate,
    // especially on a cold start, so they get a far more generous budget.
    diagnoseTimeoutMsLocal: 120_000,
    maxToolRiskClass: 'compute',
  },
  // Default `RunBudget`s for `BudgetAllocator` (plan §Reusable Foundry Agent Loop). Effort
  // tiers map to `ConversationEffort` for the interactive co-founder; `sprintWorker` covers
  // sprint specialists. Founders can override per-workspace via `WorkspacePolicy.tool`
  // (`readWorkspaceBudgetOverrides`) — these are just the defaults when nothing is set.
  agent: {
    quick: {
      maxSteps: 1,
      maxDurationMs: 15_000,
      maxUsd: 0.05,
      maxToolRiskClass: 'compute',
      contextTokenCeiling: 8_000,
    },
    standard: {
      maxSteps: 6,
      maxDurationMs: 60_000,
      maxUsd: 0.5,
      maxToolRiskClass: 'compute',
      contextTokenCeiling: 16_000,
    },
    thorough: {
      maxSteps: 16,
      maxDurationMs: 5 * 60_000,
      maxUsd: 2,
      maxToolRiskClass: 'draft',
      contextTokenCeiling: 32_000,
    },
    sprintWorker: {
      maxSteps: 12,
      maxDurationMs: 10 * 60_000,
      maxUsd: 2,
      maxToolRiskClass: 'draft',
      contextTokenCeiling: 32_000,
    },
  },
  stream: {
    replayMaxEvents: 500,
    replayMaxAgeMs: 30 * 60 * 1000,
    ttlSeconds: 24 * 60 * 60,
    keepaliveMs: 20_000,
  },
  provider: {
    capabilityProbeTimeoutMs: 8_000,
    capabilityCacheTtlSeconds: 6 * 60 * 60,
    defaultAnthropicModel: 'claude-sonnet-4-20250514',
    defaultAnthropicProbeModel: 'claude-3-5-haiku-20241022',
    defaultBedrockModel: 'moonshotai.kimi-k2.5',
    defaultBedrockRegion: 'us-east-1',
  },
  gateA: {
    ruleVersion: 1,
    minNonFriendInterviews: 3,
    minLinkedQuotes: 3,
    minDistinctInterviewsWithQuotes: 2,
  },
  gateB: {
    ruleVersion: 1,
    minIndependentMoneySignals: 1,
  },
  gateC: {
    ruleVersion: 1,
    requiredMetricKeys: [
      'paying_strangers',
      'repeat_usage',
      'contribution_margin',
      'retention',
      'distribution',
    ] as const,
  },
  mvbp: {
    maxFeaturesWithoutWaiver: 3,
  },
  approval: {
    ttlSeconds: 24 * 60 * 60,
  },
  notification: {
    weeklyDigestCron: '0 9 * * 1',
    scoreMaterialChangePoints: 5,
  },
  money: {
    decimalScale: 4,
  },
  rateLimit: {
    trpcReadPerMinute: 60,
    trpcMutationPerMinute: 20,
    // Every request carrying the admin access key (every batched tRPC call, every SSE
    // reconnect) counts against this, not just sign-in — 30/min was tripping during
    // normal single-founder use, not abuse.
    adminApiKeyPerMinute: 300,
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
