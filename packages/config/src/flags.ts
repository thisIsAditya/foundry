export const flagDefaults = {
  journeyCutover: true,
  assistantUi: true,
  cofounderWorker: true,
} as const;

export type FoundryFlagName = keyof typeof flagDefaults;

export const flagOwners = {
  journeyCutover: 'web-founder-product',
  assistantUi: 'web-cofounder-ui',
  cofounderWorker: 'cofounder-operations',
} as const;

export const flagRemovalConditions = {
  journeyCutover:
    'Remove after every active reader uses journey/record/proposal commands and legacy rollback is no longer supported.',
  assistantUi:
    'Remove after the ExternalStoreRuntime conversation is the only founder co-founder interface.',
  cofounderWorker: 'Remove after operation dispatch is permanently worker-owned.',
} as const;
