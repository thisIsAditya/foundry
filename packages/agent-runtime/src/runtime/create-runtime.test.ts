import { describe, expect, it } from 'vitest';

import { createCofounderRuntime } from './create-runtime.js';
import { DirectStructuredRuntime } from './direct-runtime.js';
import type { CofounderRuntimeInput } from './types.js';

const input: CofounderRuntimeInput = {
  operationId: '00000000-0000-4000-8000-000000000001',
  actor: {
    workspaceId: '00000000-0000-4000-8000-000000000002',
    ventureId: '00000000-0000-4000-8000-000000000003',
    userId: '00000000-0000-4000-8000-000000000004',
  },
  contextPacket: {
    actor: {
      workspaceId: '00000000-0000-4000-8000-000000000002',
      ventureId: '00000000-0000-4000-8000-000000000003',
      userId: '00000000-0000-4000-8000-000000000004',
    },
    currentStage: 'idea',
    currentObjective: 'Capture the idea.',
    acceptedRecord: [
      {
        id: '00000000-0000-4000-8000-000000000010',
        section: 'idea_founder_context',
        status: 'accepted',
        provenance: 'founder_approved',
        summary: 'Cafe owners lose two hours closing the books.',
      },
    ],
    pendingProposals: [],
    activeSteps: [],
    deferredSteps: [],
    blockedSteps: [],
    readiness: [],
    evidence: [],
    interviews: [],
    quotes: [],
    decisions: [],
    assumptions: [],
    relations: [],
    memory: null,
    recentMessages: [],
    retrieval: [],
    omitted: ['full_transcript'],
    selectionRationale: 'test',
    contextChars: 12,
    correlationId: 'corr',
    allowedCapabilities: ['venture.readCurrentState@1'],
    capabilityBudget: { maxInvocations: 8, remaining: 8 },
  },
  founderRequest: 'Help me name the customer.',
  schemaVersion: 'v5',
  capabilityManifest: ['venture.readCurrentState@1'],
  timeoutMs: 8_000,
};

describe('createCofounderRuntime', () => {
  it('boots a disabled runtime without Harness credentials', () => {
    const selected = createCofounderRuntime({ aiMode: 'off' });
    expect(selected.kind).toBe('disabled');
  });

  it('selects the direct runtime when Harness is not configured', () => {
    const selected = createCofounderRuntime({ aiMode: 'direct' });
    expect(selected.kind).toBe('direct');
  });

  it('selects Harness only when URL and token are both present', () => {
    const selected = createCofounderRuntime({
      harnessEndpoint: 'http://127.0.0.1:8787',
      harnessToken: 'harness-token-must-be-at-least-32-bytes',
    });
    expect(selected.kind).toBe('harness');
  });
});

describe('DirectStructuredRuntime', () => {
  it('grounds facts in envelope record ids and invokes readCurrentState', async () => {
    const invoked: string[] = [];
    const runtime = new DirectStructuredRuntime();
    const result = await runtime.run({
      ...input,
      capabilities: {
        async invoke(request) {
          invoked.push(request.name);
          return { ok: true, summary: 'read', data: { currentStage: 'idea' } };
        },
      },
    });
    expect(invoked).toContain('venture.readCurrentState@1');
    expect(result.facts[0]?.references[0]?.id).toBe('00000000-0000-4000-8000-000000000010');
    expect(result.interactionType).toBe('inform');
  });

  it('requests bounded source excerpts for an intake review', async () => {
    const invoked: { name: string; input: unknown }[] = [];
    const runtime = new DirectStructuredRuntime();
    await runtime.run({
      ...input,
      founderRequest: 'Review the founder intake sources and prepare a proposal.',
      capabilities: {
        async invoke(request) {
          invoked.push({ name: request.name, input: request.input });
          return { ok: true, summary: 'read', data: { currentStage: 'idea' } };
        },
      },
    });
    expect(invoked).toContainEqual({
      name: 'evidence.searchApproved@1',
      input: { query: 'founder intake', scope: 'intake' },
    });
  });
});
