import { describe, expect, it } from 'vitest';

import { diagnoseClarification } from './diagnose.js';
import { createMemoryStreamBus } from '../streaming/bus.js';
import { createClarificationTestModel } from '../test-support/mock-model.js';
import type { PackSnapshot } from '../contracts/pack-snapshot.js';
import { PackRevisionIdSchema, ProjectIdSchema } from '@foundry/domain';

const projectId = ProjectIdSchema.parse('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const packRevisionId = PackRevisionIdSchema.parse('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

function snapshot(): PackSnapshot {
  return {
    pack: {
      id: packRevisionId,
      projectId,
      revisionNumber: 1,
      parentRevisionId: null,
      actorType: 'founder',
      actorId: null,
      sourceSprintId: null,
      status: 'draft',
      proposedChanges: { clarifications: [] },
      acceptedChanges: null,
      validationResults: null,
      gateResults: null,
      dependencyInvalidations: null,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      acceptedAt: null,
    },
    phase: 'diagnose',
    interviews: [],
    quotes: [],
    beachheads: [],
    dmus: [],
    clarifications: [],
  };
}

describe('diagnoseClarification', () => {
  it('publishes text_delta events from a mocked model stream', async () => {
    const bus = createMemoryStreamBus();
    const model = createClarificationTestModel('What is the painful job to be done?');
    const diagnosed = await diagnoseClarification({
      runId: 'run-1',
      questionId: 'problem',
      answer: 'Restaurant owners lose two hours closing.',
      snapshot: snapshot(),
      model,
      publish: async (event) => {
        await bus.publish(projectId, event);
      },
    });
    expect(diagnosed.text).toContain('painful job');
    expect(bus.entries.map((entry) => entry.event.type)).toEqual([
      'message_started',
      'text_delta',
      'message_completed',
    ]);
    expect(
      bus.entries.some(
        (entry) => entry.event.type === 'text_delta' && entry.event.delta.includes('painful'),
      ),
    ).toBe(true);
  });
});
