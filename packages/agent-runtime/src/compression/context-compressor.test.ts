import {
  ConversationMessageIdSchema,
  ConversationMessageSchema,
  DecisionIdSchema,
  PackRevisionIdSchema,
  ProjectIdSchema,
  type ConversationMessage,
} from '@foundry/domain';
import { describe, expect, it } from 'vitest';

import { ContextAssembler } from '../context/context-assembler.js';
import type { AgentContextPacket } from '../context/types.js';
import { ContextCompressor } from './context-compressor.js';

const projectId = ProjectIdSchema.parse('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const packRevisionId = PackRevisionIdSchema.parse('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

function message(id: string, text: string): ConversationMessage {
  return ConversationMessageSchema.parse({
    id: ConversationMessageIdSchema.parse(id),
    projectId,
    actor: 'founder',
    text,
    blocks: [{ kind: 'concise_answer', text }],
    references: [],
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
  });
}

function basePacket(overrides: Partial<AgentContextPacket> = {}): AgentContextPacket {
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
      proposedChanges: {},
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
    projectId,
    planScore: null,
    recentMessages: [],
    conversationSummary: null,
    confirmedPreferences: [],
    openFounderTasks: [],
    recentJobs: [],
    attachedEvidence: [],
    contextItemsUsed: [],
    droppedItems: [],
    ...overrides,
  };
}

describe('ContextCompressor', () => {
  it('trims the oldest messages first when over the messages token budget', () => {
    const assembler = new ContextAssembler();
    const compressor = new ContextCompressor((packet) => assembler.format(packet));
    const longText = 'x'.repeat(400);
    const messages = Array.from({ length: 10 }, (_, index) =>
      message(`aaaaaaaa-0000-4000-8000-00000000000${index}`, `${longText}-${index}`),
    );
    const packet = basePacket({ recentMessages: messages });

    const result = compressor.compress(packet, {
      messagesTokens: 200,
      planFactsTokens: 5_000,
      evidenceTokens: 5_000,
    });

    expect(result.packet.recentMessages.length).toBeLessThan(messages.length);
    // Oldest messages (lowest index) should be dropped first.
    expect(result.packet.recentMessages[0]?.text.endsWith('-9')).toBe(true);
    expect(result.droppedItems.some((item) => item.kind === 'conversation_message')).toBe(true);
  });

  it('trims oldest decisions first when plan facts exceed their budget, keeping recent ones', () => {
    const assembler = new ContextAssembler();
    const compressor = new ContextCompressor((packet) => assembler.format(packet));
    const decisions = Array.from({ length: 10 }, (_, index) => ({
      id: DecisionIdSchema.parse(`44444444-0000-4000-8000-00000000000${index}`),
      projectId,
      options: {},
      chosen: { pick: `option-${index}` },
      rationale: 'x'.repeat(200),
      evidenceRefs: null,
      gateId: null,
      sprintId: null,
      decidedByUserId: null,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
    }));
    const packet = basePacket({ decisions });

    const result = compressor.compress(packet, {
      messagesTokens: 50,
      planFactsTokens: 50,
      evidenceTokens: 0,
    });

    expect(result.packet.decisions.length).toBeLessThan(decisions.length);
    expect(result.packet.decisions.length).toBeGreaterThanOrEqual(3);
    expect(result.droppedItems.some((item) => item.kind === 'decision')).toBe(true);
  });

  it('leaves a well-under-budget packet untouched', () => {
    const assembler = new ContextAssembler();
    const compressor = new ContextCompressor((packet) => assembler.format(packet));
    const packet = basePacket({
      recentMessages: [message('aaaaaaaa-0000-4000-8000-000000000000', 'hi')],
    });

    const result = compressor.compress(packet, {
      messagesTokens: 5_000,
      planFactsTokens: 5_000,
      evidenceTokens: 5_000,
    });

    expect(result.packet.recentMessages).toHaveLength(1);
    expect(result.droppedItems).toHaveLength(0);
  });
});
