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
  'project.create': ['project.list'],
  'project.answerClarification': ['project.getDeskSummary', 'sprint.getActivity'],
  'sprint.preview': ['sprint.getContract'],
  'sprint.approvePlan': ['sprint.getContract', 'sprint.getActivity'],
  'sprint.pause': ['sprint.getContract'],
  'sprint.resume': ['sprint.getContract'],
  'sprint.stop': ['sprint.getContract'],
  'pack.export': [],
  'pack.upsertSection': ['pack.getSection', 'project.getDeskSummary'],
  'pack.upsertBeachhead': ['project.getDeskSummary'],
  'pack.upsertDmu': ['project.getDeskSummary'],
  'pack.addFounderAssertion': ['pack.getSection'],
  'pack.acceptRevision': ['pack.getSection', 'pack.getDiff', 'project.getDeskSummary'],
  'pack.rejectRevision': ['pack.getSection', 'project.getDeskSummary'],
  'evidence.createUploadIntent': ['evidence.list'],
  'evidence.addInterview': ['evidence.listInterviews', 'project.getDeskSummary'],
  'evidence.confirmUpload': ['evidence.list'],
  'approval.request': ['approval.list'],
  'approval.approve': ['approval.list', 'approval.getPayload'],
  'approval.reject': ['approval.list', 'approval.getPayload'],
  'decision.record': ['decision.list', 'project.getDeskSummary'],
  'metric.define': ['metric.listDefinitions'],
  'metric.recordObservation': ['metric.listObservations'],
  'gate.evaluate': ['decision.list', 'project.getDeskSummary'],
  'moneyRules.setCurrent': ['moneyRules.getCurrent', 'artifact.list'],
  'moneyRules.upsertMarket': ['moneyRules.getCurrent', 'artifact.list'],
  'wtp.createExperiment': ['wtp.list'],
  'wtp.record': ['wtp.list'],
  'wtp.evaluateGateB': ['wtp.list'],
  'provider.connect': ['provider.listConnections'],
  'artifact.generate': ['artifact.list', 'artifact.getVersion'],
  'artifact.regenerate': ['artifact.list', 'artifact.getVersion'],
  'artifact.generateWorkbook': ['artifact.list'],
  'mcpServer.add': ['mcpServer.list'],
  'mcpServer.remove': ['mcpServer.list'],
  'mcpServer.toggle': ['mcpServer.list'],
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
