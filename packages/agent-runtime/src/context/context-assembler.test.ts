import {
  AssumptionIdSchema,
  BeachheadIdSchema,
  PackRevisionIdSchema,
  ProblemIdSchema,
  ProjectIdSchema,
} from '@foundry/domain';
import { describe, expect, it } from 'vitest';

import type { PackSnapshot } from '../contracts/pack-snapshot.js';
import { ContextAssembler } from './context-assembler.js';
import { DEFAULT_ITEM_CAP } from './selection-rules.js';

const projectId = ProjectIdSchema.parse('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const packRevisionId = PackRevisionIdSchema.parse('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const draftRevisionId = PackRevisionIdSchema.parse('dddddddd-dddd-4ddd-8ddd-dddddddddddd');

function baseSnapshot(overrides: Partial<PackSnapshot> = {}): PackSnapshot {
  return {
    pack: {
      id: packRevisionId,
      projectId,
      revisionNumber: 1,
      parentRevisionId: null,
      actorType: 'founder',
      actorId: null,
      sourceSprintId: null,
      status: 'accepted',
      proposedChanges: { clarifications: [] },
      acceptedChanges: null,
      validationResults: null,
      gateResults: null,
      dependencyInvalidations: null,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      acceptedAt: new Date('2026-04-01T00:00:00.000Z'),
    },
    pendingDraftRevision: null,
    phase: 'problem',
    derivedPhase: null,
    interviews: [],
    quotes: [],
    beachheads: [],
    dmus: [],
    personas: [],
    problems: [],
    moneyRules: null,
    marketModels: [],
    unitEconomics: [],
    wtpEvents: [],
    assumptions: [],
    decisions: [],
    packSections: [],
    clarifications: [],
    ...overrides,
  };
}

describe('ContextAssembler', () => {
  it('keeps every plan-fact category in the formatted prompt (no silent drops)', () => {
    const assembler = new ContextAssembler();
    const snapshot = baseSnapshot({
      problems: [
        {
          id: ProblemIdSchema.parse('11111111-1111-4111-8111-111111111111'),
          packRevisionId,
          statement: 'Restaurant owners lose two hours closing the register each night.',
          createdAt: new Date('2026-04-01T00:00:00.000Z'),
        },
      ],
      beachheads: [
        {
          id: BeachheadIdSchema.parse('22222222-2222-4222-8222-222222222222'),
          packRevisionId,
          segmentDefinition: 'Independent single-location restaurants in tier-2 cities',
          personaId: null,
          dmuId: null,
          createdAt: new Date('2026-04-01T00:00:00.000Z'),
        },
      ],
      assumptions: [
        {
          id: AssumptionIdSchema.parse('33333333-3333-4333-8333-333333333333'),
          projectId,
          statement: 'Owners will pay a monthly subscription for closing automation.',
          status: 'untested',
          createdAt: new Date('2026-04-01T00:00:00.000Z'),
          updatedAt: new Date('2026-04-01T00:00:00.000Z'),
        },
      ],
      pendingDraftRevision: {
        id: draftRevisionId,
        projectId,
        revisionNumber: 2,
        parentRevisionId: packRevisionId,
        actorType: 'agent',
        actorId: null,
        sourceSprintId: null,
        status: 'draft',
        proposedChanges: { result: 'Draft synthesis text' },
        acceptedChanges: null,
        validationResults: null,
        gateResults: null,
        dependencyInvalidations: null,
        createdAt: new Date('2026-04-02T00:00:00.000Z'),
        acceptedAt: null,
      },
    });

    const context = assembler.assemble({
      projectId,
      snapshot,
      planScore: null,
      recentMessages: [],
      conversationSummary: null,
      confirmedPreferences: [],
      openFounderTasks: [],
      recentJobs: [],
      attachedEvidence: [],
    });
    const formatted = assembler.format(context);

    expect(formatted).toContain('Restaurant owners lose two hours closing the register');
    expect(formatted).toContain('Independent single-location restaurants in tier-2 cities');
    expect(formatted).toContain('Owners will pay a monthly subscription');
    expect(formatted).toContain('pending founder review');
    expect(context.contextItemsUsed).toEqual(
      expect.arrayContaining([
        { kind: 'revision', id: packRevisionId },
        { kind: 'revision', id: draftRevisionId },
      ]),
    );
  });

  it('caps oversized categories and records provenance for what was dropped', () => {
    const assembler = new ContextAssembler();
    const manyProblems = Array.from({ length: DEFAULT_ITEM_CAP + 5 }, (_, index) => ({
      id: ProblemIdSchema.parse(
        `44444444-${String(index).padStart(4, '0')}-4444-8444-444444444444`,
      ),
      packRevisionId,
      statement: `Problem statement number ${index}`,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
    }));
    const snapshot = baseSnapshot({ problems: manyProblems });

    const context = assembler.assemble({
      projectId,
      snapshot,
      planScore: null,
      recentMessages: [],
      conversationSummary: null,
      confirmedPreferences: [],
      openFounderTasks: [],
      recentJobs: [],
      attachedEvidence: [],
    });

    expect(context.problems).toHaveLength(DEFAULT_ITEM_CAP);
    expect(context.droppedItems).toHaveLength(5);
    expect(context.droppedItems[0]?.kind).toBe('problem');
  });
});
