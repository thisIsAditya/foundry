import type { RecordProvenance } from '@foundry/domain';

const PROVENANCE_LABEL: Record<RecordProvenance, string> = {
  founder_input: 'Founder input',
  cited_evidence: 'Cited evidence',
  derived: 'Derived',
  ai_proposal: 'AI proposal',
  founder_approved: 'Founder approved',
  unverified: 'Unverified',
  contradicted: 'Contradicted',
};

export function ProvenanceBadge({
  provenance,
  stale,
}: {
  provenance: RecordProvenance;
  stale?: boolean;
}) {
  const label = stale === true ? 'Stale' : PROVENANCE_LABEL[provenance];
  return (
    <span className="badge" title={label}>
      {label}
    </span>
  );
}
