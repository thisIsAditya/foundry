import { describe, expect, it } from 'vitest';

import { classifyInterviewSource, extractInterviewCandidates } from './extract-candidates.js';

describe('extractInterviewCandidates', () => {
  it('splits a three-interview bundle and never infers consent as true', () => {
    const text = `Interview 1
Cafe owner in Pune.
> We lose two hours closing the books.

---
Interview 2
participant type: friend
> I would not pay for this.

---
Interview 3
consent: yes
> The reconciling is the painful part.`;
    const candidates = extractInterviewCandidates(text);
    expect(candidates).toHaveLength(3);
    expect(candidates.every((item) => item.consentGiven === false)).toBe(true);
    expect(candidates.every((item) => item.consentUnknown === true)).toBe(true);
    expect(classifyInterviewSource(candidates).classification).toBe('interview_bundle');
    expect(candidates[1]?.participantType).toBe('friend');
  });

  it('parses a JSON array of interviews', () => {
    const candidates = extractInterviewCandidates(
      JSON.stringify([
        { label: 'A', notes: 'Night close', quotes: ['Takes too long'] },
        { label: 'B', participantType: 'non_friend', quotes: ['I already pay a bookkeeper'] },
      ]),
    );
    expect(candidates).toHaveLength(2);
    expect(candidates[0]?.label).toBe('A');
    expect(candidates[1]?.participantType).toBe('non_friend');
    expect(candidates[0]?.consentGiven).toBe(false);
  });
});
