import { describe, expect, it, vi } from 'vitest';

import { DeepSeekHarnessRuntime } from './deepseek-harness-runtime.js';
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
    acceptedRecord: [],
    pendingProposals: [],
    activeSteps: [],
    readiness: [],
    recentMessages: [],
    omitted: ['full_transcript'],
    correlationId: 'corr',
    allowedCapabilities: ['venture.readCurrentState'],
  },
  founderRequest: 'I want to help cafe owners close the books.',
  schemaVersion: 'v4.5',
  capabilityManifest: ['venture.readCurrentState'],
  timeoutMs: 8_000,
};

describe('DeepSeekHarnessRuntime', () => {
  it('uses the isolated adapter and validates the returned application result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            explanation: 'What part of closing takes longest?',
            interactionType: 'ask',
            references: [],
            uncertainty: 'No interviews are recorded yet.',
            blockedConditions: [],
            activity: 'Asked one clarifying question.',
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const runtime = new DeepSeekHarnessRuntime({
      endpoint: 'http://harness.internal:8787/',
      token: 'harness-token-must-be-at-least-32-bytes',
    });
    await expect(runtime.run(input)).resolves.toMatchObject({ interactionType: 'ask' });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://harness.internal:8787/v1/cofounder/run',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer harness-token-must-be-at-least-32-bytes',
        }),
      }),
    );
    vi.unstubAllGlobals();
  });
});
