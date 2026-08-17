import type { AgentRunOutput } from '@foundry/agent-runtime';
import {
  emptyPackSectionBody,
  getPackRevisionById,
  insertBeachhead,
  insertDmu,
  insertPackRevision,
  listBeachheadsByPackRevisionId,
  listDmusByPackRevisionId,
  listPackRevisionsByProjectId,
  listPackSections,
  updateBeachheadDmuId,
  upsertPackSection,
  type Sql,
} from '@foundry/db';
import {
  GtmSectionBodySchema,
  LaunchSectionBodySchema,
  LegalSectionBodySchema,
  MvbpSectionBodySchema,
  OrgCostSectionBodySchema,
  PackSectionKeys,
  type BeachheadId,
  type PackRevisionId,
  type PackSectionBody,
  type PackSectionKey,
  type ProjectId,
  type SprintId,
} from '@foundry/domain';

function mergeSectionBody(
  section: PackSectionKey,
  base: PackSectionBody,
  overlay: Record<string, unknown>,
): PackSectionBody {
  const merged = { ...base, ...overlay };
  switch (section) {
    case 'mvbp':
      return MvbpSectionBodySchema.parse(merged);
    case 'gtm':
      return GtmSectionBodySchema.parse(merged);
    case 'org_cost':
      return OrgCostSectionBodySchema.parse(merged);
    case 'legal':
      return LegalSectionBodySchema.parse(merged);
    case 'launch':
      return LaunchSectionBodySchema.parse(merged);
  }
}

export type ProposePackRevisionInput = {
  projectId: ProjectId;
  parentPackRevisionId: PackRevisionId;
  sprintId: SprintId;
  synthesis: AgentRunOutput;
};

/**
 * Drafts the next pack revision from a sprint's synthesis without mutating the founder's
 * current revision (plan §Slice 2 "Pack as system of record"). The draft is a full
 * copy-on-write snapshot of the parent — sections, beachhead, and DMU — with the agent's
 * proposed section changes layered on top, so accepting it never regresses evidence the
 * founder already captured.
 */
export async function proposePackRevisionFromSynthesis(
  tx: Sql,
  input: ProposePackRevisionInput,
): Promise<PackRevisionId | null> {
  if (input.synthesis.proposedPackChanges.length === 0) {
    return null;
  }
  const parentRevision = await getPackRevisionById(tx, input.parentPackRevisionId);
  if (parentRevision === null) {
    return null;
  }
  const revisions = await listPackRevisionsByProjectId(tx, input.projectId);
  const highestRevisionNumber = revisions.reduce(
    (max, revision) => Math.max(max, revision.revisionNumber),
    parentRevision.revisionNumber,
  );
  const created = await insertPackRevision(tx, {
    projectId: input.projectId,
    revisionNumber: highestRevisionNumber + 1,
    parentRevisionId: parentRevision.id,
    actorType: 'agent',
    sourceSprintId: input.sprintId,
    status: 'draft',
    proposedChanges: {
      result: input.synthesis.result,
      proposedPackChanges: input.synthesis.proposedPackChanges,
      evidenceRefs: input.synthesis.evidenceRefs,
      assumptionsChanged: input.synthesis.assumptionsChanged,
      unresolvedConflicts: input.synthesis.unresolvedConflicts,
      confidence: input.synthesis.confidence,
      recommendedNextAction: input.synthesis.recommendedNextAction,
    },
  });

  const parentSections = await listPackSections(tx, parentRevision.id);
  const overlays = new Map(
    input.synthesis.proposedPackChanges.map((change) => [change.targetSection, change.body]),
  );
  for (const section of PackSectionKeys) {
    const baseBody =
      parentSections.find((item) => item.section === section)?.body ??
      emptyPackSectionBody(section);
    const overlay = overlays.get(section);
    const body = overlay === undefined ? baseBody : mergeSectionBody(section, baseBody, overlay);
    await upsertPackSection(tx, { packRevisionId: created.id, section, body });
  }

  const parentBeachheads = await listBeachheadsByPackRevisionId(tx, parentRevision.id);
  const beachheadIdMap = new Map<BeachheadId, BeachheadId>();
  for (const beachhead of parentBeachheads) {
    const copy = await insertBeachhead(tx, {
      packRevisionId: created.id,
      segmentDefinition: beachhead.segmentDefinition,
      personaId: beachhead.personaId,
    });
    beachheadIdMap.set(beachhead.id, copy.id);
  }
  const parentDmus = await listDmusByPackRevisionId(tx, parentRevision.id);
  for (const dmu of parentDmus) {
    const newBeachheadId = beachheadIdMap.get(dmu.beachheadId);
    if (newBeachheadId === undefined) {
      continue;
    }
    const copiedDmu = await insertDmu(tx, {
      packRevisionId: created.id,
      beachheadId: newBeachheadId,
      user: dmu.user,
      champion: dmu.champion,
      buyer: dmu.buyer,
      approver: dmu.approver,
      veto: dmu.veto,
      procurement: dmu.procurement,
    });
    const originalBeachhead = parentBeachheads.find((item) => item.id === dmu.beachheadId);
    if (originalBeachhead?.dmuId === dmu.id) {
      await updateBeachheadDmuId(tx, newBeachheadId, copiedDmu.id);
    }
  }

  return created.id;
}
