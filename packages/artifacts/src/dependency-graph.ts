import type { ArtifactDependencyKind, ArtifactType } from '@foundry/domain';

export const ARTIFACT_DEPENDENCIES: Record<ArtifactType, readonly ArtifactDependencyKind[]> = {
  company_pack: ['pack_revision', 'money_rules', 'interview', 'beachhead', 'wtp_event'],
  lean_canvas: ['pack_revision', 'money_rules', 'beachhead'],
  business_model_canvas: ['pack_revision', 'money_rules', 'beachhead'],
  evidence_report: ['interview', 'pack_revision'],
  one_page_brief: ['pack_revision', 'money_rules', 'interview'],
  slide_outline: ['pack_revision', 'money_rules', 'interview', 'beachhead', 'wtp_event'],
  market_economics_workbook: ['money_rules', 'market_model', 'unit_economics_model', 'beachhead'],
};

export function dependentsOf(kind: ArtifactDependencyKind): ArtifactType[] {
  return (Object.keys(ARTIFACT_DEPENDENCIES) as ArtifactType[]).filter((type) =>
    ARTIFACT_DEPENDENCIES[type].includes(kind),
  );
}

export function staleReason(kind: ArtifactDependencyKind): string {
  return `${kind} changed; regenerate the dependent artifact.`;
}
