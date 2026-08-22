export const mutationInvalidations = {
  'workspace.create': ['workspace.list'],
  'project.create': ['project.list', 'journey.getOverview', 'record.listSections'],
  'evidence.createUploadIntent': ['evidence.list'],
  'evidence.addInterview': ['evidence.listInterviews', 'evidence.listLibrary'],
  'evidence.confirmUpload': ['evidence.list', 'evidence.listLibrary'],
  'evidence.recordObservation': ['evidence.listLibrary'],
  'decision.record': ['decision.list'],
  'member.invite': ['member.list'],
  'member.updateRole': ['member.list'],
  'journey.setObjective': ['journey.getOverview', 'journey.getMap'],
  'journey.startStep': ['journey.getOverview', 'journey.getMap', 'journey.getStep'],
  'journey.submitStep': [
    'journey.getOverview',
    'journey.getMap',
    'journey.getStep',
    'record.listSections',
  ],
  'journey.deferStep': ['journey.getOverview', 'journey.getMap', 'journey.getStep'],
  'journey.revisitStage': ['journey.getOverview', 'journey.getMap'],
  'journey.captureEvidence': ['journey.getOverview', 'record.listSections', 'evidence.listLibrary'],
  'record.recordAssumption': ['record.listSections', 'record.getSection', 'journey.getOverview'],
  'record.recordDecision': ['record.listSections', 'proposal.list', 'journey.getOverview'],
  'record.defineExperiment': ['record.listSections', 'record.getSection'],
  'record.acceptChanges': [
    'record.listSections',
    'record.getSection',
    'record.export',
    'proposal.get',
    'proposal.list',
    'journey.getOverview',
  ],
  'proposal.create': ['proposal.list', 'journey.getOverview'],
  'proposal.review': [
    'proposal.get',
    'proposal.list',
    'record.listSections',
    'record.getSection',
    'journey.getOverview',
  ],
  'cofounder.respond': ['conversation.list', 'proposal.list', 'journey.getOverview'],
  'cofounder.cancel': ['journey.getOverview'],
} as const satisfies Record<string, readonly string[]>;

export type MutationPath = keyof typeof mutationInvalidations;

export function invalidationsFor(path: string): readonly string[] {
  return (mutationInvalidations as Record<string, readonly string[]>)[path] ?? [];
}
