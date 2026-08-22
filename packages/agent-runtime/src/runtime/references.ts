import type { CofounderContextPacket } from './types.js';

export type KnownReference = { kind: string; id: string };

export function collectEnvelopeReferenceIds(packet: CofounderContextPacket): Set<string> {
  const ids = new Set<string>();
  const add = (kind: string, id: string | null | undefined): void => {
    if (id !== null && id !== undefined && id.length > 0) {
      ids.add(`${kind}:${id}`);
      ids.add(id);
    }
  };
  add('venture', packet.actor.ventureId);
  for (const item of packet.acceptedRecord) {
    add('record', item.id);
    add('section', item.section);
  }
  for (const item of packet.pendingProposals) {
    add('proposal', item.id);
  }
  for (const item of packet.activeSteps) {
    add('step', item.id);
  }
  for (const item of packet.deferredSteps) {
    add('step', item.id);
  }
  for (const item of packet.blockedSteps) {
    add('step', item.id);
  }
  for (const item of packet.evidence) {
    add('evidence', item.id);
  }
  for (const item of packet.interviews) {
    add('interview', item.id);
  }
  for (const item of packet.quotes) {
    add('quote', item.id);
  }
  for (const item of packet.decisions) {
    add('decision', item.id);
  }
  if (packet.memory !== null) {
    add('memory', packet.memory.id);
  }
  for (const item of packet.retrieval) {
    add(item.kind, item.id);
    add('evidence', item.citationId);
  }
  for (const item of packet.relations) {
    add(item.targetKind, item.targetId);
    add('record', item.recordItemId);
  }
  return ids;
}

export function collectCapabilityReferenceIds(
  data: Record<string, unknown> | undefined,
): KnownReference[] {
  if (data === undefined) {
    return [];
  }
  const refs: KnownReference[] = [];
  const push = (kind: string, value: unknown): void => {
    if (typeof value === 'string' && value.length > 0) {
      refs.push({ kind, id: value });
    }
  };
  push('proposal', data.proposalId);
  push('evidence', data.evidenceItemId);
  push('evidence', data.draftId);
  push('source', data.sourceId);
  push('citation', data.citationId);
  if (Array.isArray(data.hits)) {
    for (const hit of data.hits) {
      if (hit !== null && typeof hit === 'object' && 'id' in hit) {
        const kind = 'kind' in hit && typeof hit.kind === 'string' ? hit.kind : 'evidence';
        push(kind, hit.id);
      }
    }
  }
  if (Array.isArray(data.ids)) {
    for (const id of data.ids) {
      push('evidence', id);
    }
  }
  return refs;
}

export function isKnownReference(ref: KnownReference, known: Set<string>): boolean {
  return known.has(`${ref.kind}:${ref.id}`) || known.has(ref.id);
}
