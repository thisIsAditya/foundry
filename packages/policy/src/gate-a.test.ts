import { describe, expect, it } from 'vitest';

import { evaluateGateA } from './gate-a.js';
import {
  BeachheadIdSchema,
  DmuIdSchema,
  InterviewIdSchema,
  PackRevisionIdSchema,
  ProjectIdSchema,
  QuoteIdSchema,
  type Beachhead,
  type Dmu,
  type Interview,
  type Quote,
} from '@foundry/domain';

const projectId = ProjectIdSchema.parse('11111111-1111-4111-8111-111111111111');
const packRevisionId = PackRevisionIdSchema.parse('22222222-2222-4222-8222-222222222222');

function interview(
  id: string,
  participantType: Interview['participantType'],
  consent: unknown,
): Interview {
  return {
    id: InterviewIdSchema.parse(id),
    projectId,
    participantType,
    consent,
    conductedAt: new Date('2026-04-01T00:00:00.000Z'),
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
  };
}

function quote(id: string, interviewId: string, text: string): Quote {
  return {
    id: QuoteIdSchema.parse(id),
    interviewId: InterviewIdSchema.parse(interviewId),
    sourceSnapshotId: null,
    textContent: text,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
  };
}

function beachhead(dmuId: string | null): Beachhead {
  return {
    id: BeachheadIdSchema.parse('33333333-3333-4333-8333-333333333333'),
    packRevisionId,
    segmentDefinition: 'Independent restaurant owners in Pune',
    personaId: null,
    dmuId: dmuId === null ? null : DmuIdSchema.parse(dmuId),
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
  };
}

function dmu(): Dmu {
  return {
    id: DmuIdSchema.parse('44444444-4444-4444-8444-444444444444'),
    packRevisionId,
    beachheadId: BeachheadIdSchema.parse('33333333-3333-4333-8333-333333333333'),
    user: 'Chef-owner',
    champion: null,
    buyer: 'Chef-owner',
    approver: null,
    veto: null,
    procurement: null,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
  };
}

const qualifyingIds = [
  '55555555-5555-4555-8555-555555555551',
  '55555555-5555-4555-8555-555555555552',
  '55555555-5555-4555-8555-555555555553',
] as const;

function passingInput(): Parameters<typeof evaluateGateA>[0] {
  return {
    interviews: qualifyingIds.map((id) => interview(id, 'non_friend', { given: true })),
    quotes: [
      quote('66666666-6666-4666-8666-666666666661', qualifyingIds[0], 'We lose two hours a night'),
      quote('66666666-6666-4666-8666-666666666662', qualifyingIds[1], 'The workaround costs staff'),
      quote('66666666-6666-4666-8666-666666666663', qualifyingIds[2], 'I would pay to stop this'),
    ],
    beachheads: [beachhead('44444444-4444-4444-8444-444444444444')],
    dmus: [dmu()],
  };
}

describe('evaluateGateA', () => {
  it('passes when real non-friend interviews, quotes, beachhead, and DMU are present', () => {
    const result = evaluateGateA(passingInput());
    expect(result.result).toBe('passed');
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });

  it('cannot pass on friend or simulated interviews', () => {
    const friends = [
      interview('55555555-5555-4555-8555-555555555551', 'friend', { given: true }),
      interview('55555555-5555-4555-8555-555555555552', 'friend', { given: true }),
      interview('55555555-5555-4555-8555-555555555553', 'friend', { given: true }),
    ];
    const simulated = [
      interview('55555555-5555-4555-8555-555555555551', 'non_friend', { simulated: true }),
      interview('55555555-5555-4555-8555-555555555552', 'non_friend', { simulated: true }),
      interview('55555555-5555-4555-8555-555555555553', 'non_friend', { hypotheticalPitch: true }),
    ];
    for (const interviews of [friends, simulated]) {
      const result = evaluateGateA({
        ...passingInput(),
        interviews,
        quotes: [
          quote('66666666-6666-4666-8666-666666666661', interviews[0]!.id, 'pain'),
          quote('66666666-6666-4666-8666-666666666662', interviews[1]!.id, 'pain'),
          quote('66666666-6666-4666-8666-666666666663', interviews[2]!.id, 'pain'),
        ],
      });
      expect(result.result).toBe('failed');
      expect(result.countedInterviewIds).toEqual([]);
      expect(result.checks.find((check) => check.id === 'non_friend_interviews')?.passed).toBe(
        false,
      );
    }
  });
});
