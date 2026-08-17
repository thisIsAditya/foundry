import type { GateAEvaluation } from '@foundry/policy';

import type { CriticOutput } from '../contracts/output-schema.js';
import type { AgentRunOutput } from '../contracts/output-schema.js';
import type { PackSnapshot } from '../contracts/pack-snapshot.js';

export function evaluateCritique(input: {
  snapshot: PackSnapshot;
  synthesis: AgentRunOutput;
  gateA: GateAEvaluation;
}): CriticOutput {
  const instantFailFlags: string[] = [];
  const simulated = input.snapshot.interviews.filter((interview) => {
    const consent =
      interview.consent !== null && typeof interview.consent === 'object'
        ? (interview.consent as { simulated?: boolean; hypotheticalPitch?: boolean })
        : {};
    return (
      interview.participantType === 'friend' ||
      consent.simulated === true ||
      consent.hypotheticalPitch === true
    );
  });
  if (simulated.length > 0 && input.gateA.result === 'passed') {
    instantFailFlags.push('simulated_interviews_cannot_pass_gate_a');
  }
  if (
    input.snapshot.interviews.length > 0 &&
    input.gateA.result === 'failed' &&
    simulated.length === input.snapshot.interviews.length
  ) {
    instantFailFlags.push('gate_a_simulated_or_friend_only');
  }

  if (instantFailFlags.length > 0) {
    return {
      recommendation: 'KILL',
      summary: 'Instant fail: simulated or friend interviews cannot satisfy Gate A.',
      instantFailFlags,
      rubricNotes: input.gateA.checks.map((check) => check.detail),
    };
  }
  if (input.gateA.result === 'failed') {
    return {
      recommendation: 'PIVOT',
      summary: 'Gate A is not met. Collect real non-friend interviews and linked quotes.',
      instantFailFlags: [],
      rubricNotes: input.gateA.checks.filter((check) => !check.passed).map((check) => check.detail),
    };
  }
  return {
    recommendation: 'GO',
    summary: input.synthesis.result,
    instantFailFlags: [],
    rubricNotes: ['Deterministic Gate A checks passed.'],
  };
}
