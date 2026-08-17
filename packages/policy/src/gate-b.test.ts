import { describe, expect, it } from 'vitest';

import { evaluateGateB } from './gate-b.js';
import {
  ExperimentIdSchema,
  OfferIdSchema,
  WtpEventIdSchema,
  type WtpEvent,
} from '@foundry/domain';

function event(
  id: string,
  participantClass: WtpEvent['participantClass'],
  instrument: WtpEvent['instrument'],
): WtpEvent {
  return {
    id: WtpEventIdSchema.parse(id),
    experimentId: ExperimentIdSchema.parse('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    offerId: OfferIdSchema.parse('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
    participantClass,
    instrument,
    amount: '1000',
    currency: 'INR',
    occurredAt: new Date('2026-04-01T00:00:00.000Z'),
  };
}

describe('evaluateGateB', () => {
  it('passes on an independent-prospect paid pilot', () => {
    const result = evaluateGateB({
      events: [event('11111111-1111-4111-8111-111111111111', 'independent_prospect', 'paid_pilot')],
    });
    expect(result.result).toBe('passed');
    expect(result.countedEventIds).toHaveLength(1);
  });

  it('cannot pass on waitlists, comments, or simulated customers', () => {
    for (const instrument of ['waitlist', 'comment', 'simulated'] as const) {
      const result = evaluateGateB({
        events: [event('11111111-1111-4111-8111-111111111111', 'independent_prospect', instrument)],
      });
      expect(result.result).toBe('failed');
      expect(result.countedEventIds).toEqual([]);
    }
  });

  it('cannot pass on friend-only payments', () => {
    const result = evaluateGateB({
      events: [
        event('11111111-1111-4111-8111-111111111111', 'friend', 'invoice'),
        event('22222222-2222-4222-8222-222222222222', 'friend', 'deposit'),
      ],
    });
    expect(result.result).toBe('failed');
    expect(result.checks.find((check) => check.id === 'not_friend_only')?.passed).toBe(false);
  });
});
