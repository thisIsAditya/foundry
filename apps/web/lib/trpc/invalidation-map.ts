/**
 * Single source of truth for which queries a mutation should invalidate.
 *
 * Server routers attach these lists via `.meta({ invalidates: ... })` so they show up
 * in the tRPC panel/docs. The browser `QueryClient` (see `provider.tsx`) reads the same
 * map through its `MutationCache` to invalidate the corresponding queries after every
 * successful mutation, so callers don't have to invalidate manually.
 */
export const mutationInvalidations = {
  'workspace.create': ['workspace.list'],
  'project.create': ['project.list', 'project.getDeskSummary'],
  'conversation.send': [
    'conversation.list',
    'project.getDeskSummary',
    'job.list',
    'founderTask.list',
    'score.getCurrent',
  ],
  'conversation.confirmPreference': ['conversation.listPreferences'],
  'conversation.correctPreference': ['conversation.listPreferences'],
  'sprint.preview': ['sprint.getContract', 'job.list', 'project.getDeskSummary'],
  'sprint.approvePlan': ['sprint.getContract', 'sprint.getActivity', 'job.list'],
  'sprint.pause': ['sprint.getContract', 'job.list'],
  'sprint.resume': ['sprint.getContract', 'job.list'],
  'sprint.stop': ['sprint.getContract', 'job.list'],
  'job.updateSettings': ['job.get', 'job.list', 'sprint.getContract'],
  'job.retry': ['job.get', 'job.list', 'sprint.getContract'],
  'pack.export': [],
  'pack.upsertSection': [
    'pack.getSection',
    'pack.listBusinessModelSections',
    'project.getDeskSummary',
  ],
  'pack.upsertBeachhead': ['project.getDeskSummary', 'pack.listBusinessModelSections'],
  'pack.upsertDmu': ['project.getDeskSummary', 'pack.listBusinessModelSections'],
  'pack.addFounderAssertion': ['pack.getSection', 'pack.listBusinessModelSections'],
  'pack.acceptRevision': [
    'pack.getSection',
    'pack.getDiff',
    'pack.listBusinessModelSections',
    'project.getDeskSummary',
    'score.getCurrent',
  ],
  'pack.rejectRevision': ['pack.getSection', 'project.getDeskSummary'],
  'pack.acceptSection': [
    'pack.listBusinessModelSections',
    'pack.getBusinessModelSection',
    'pack.listRevisions',
  ],
  'pack.acceptAllSafeSections': [
    'pack.listBusinessModelSections',
    'pack.getBusinessModelSection',
    'pack.listRevisions',
  ],
  'founderTask.requestHelp': ['founderTask.get', 'conversation.list'],
  'founderTask.complete': ['founderTask.list', 'founderTask.get', 'project.getDeskSummary'],
  'founderTask.defer': ['founderTask.list', 'founderTask.get', 'project.getDeskSummary'],
  'founderTask.skip': ['founderTask.list', 'founderTask.get', 'project.getDeskSummary'],
  'evidence.createUploadIntent': ['evidence.list'],
  'evidence.addInterview': [
    'evidence.listInterviews',
    'evidence.listLibrary',
    'project.getDeskSummary',
    'score.getCurrent',
  ],
  'evidence.confirmUpload': ['evidence.list', 'evidence.listLibrary'],
  'evidence.recordObservation': [
    'evidence.listLibrary',
    'project.getDeskSummary',
    'score.getCurrent',
  ],
  'approval.request': ['approval.list'],
  'approval.approve': ['approval.list', 'approval.getPayload'],
  'approval.reject': ['approval.list', 'approval.getPayload'],
  'decision.record': ['decision.list', 'project.getDeskSummary'],
  'metric.define': ['metric.listDefinitions'],
  'metric.recordObservation': ['metric.listObservations', 'score.getCurrent'],
  'gate.evaluate': ['decision.list', 'project.getDeskSummary'],
  'moneyRules.setCurrent': ['moneyRules.getCurrent', 'artifact.list', 'score.getCurrent'],
  'moneyRules.upsertMarket': ['moneyRules.getCurrent', 'artifact.list'],
  'wtp.createExperiment': ['wtp.list'],
  'wtp.record': ['wtp.list', 'score.getCurrent'],
  'wtp.evaluateGateB': ['wtp.list'],
  'provider.connect': ['provider.listConnections'],
  'artifact.generate': ['artifact.list', 'artifact.getVersion'],
  'artifact.regenerate': ['artifact.list', 'artifact.getVersion'],
  'artifact.generateWorkbook': ['artifact.list'],
  'mcpServer.add': ['mcpServer.list'],
  'mcpServer.remove': ['mcpServer.list'],
  'mcpServer.toggle': ['mcpServer.list'],
  'mcpServer.setReadOnly': ['mcpServer.list'],
  'mcpServer.testConnection': ['mcpServer.list'],
  'integration.connect': ['integration.list'],
  'integration.revoke': ['integration.list'],
  'member.invite': ['member.list'],
  'member.updateRole': ['member.list'],
} as const satisfies Record<string, readonly string[]>;

export type MutationPath = keyof typeof mutationInvalidations;

export function invalidationsFor(path: string): readonly string[] {
  return (mutationInvalidations as Record<string, readonly string[]>)[path] ?? [];
}
