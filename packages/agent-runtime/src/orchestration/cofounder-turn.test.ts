import { describe, expect, it, vi } from 'vitest';

import { FounderTaskIdSchema, SprintIdSchema } from '@foundry/domain';

import { CofounderDecisionSchema } from '../contracts/output-schema.js';
import { dispatchCofounderDecision, type CofounderActions } from './cofounder-turn.js';

const jobId = SprintIdSchema.parse('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const founderTaskId = FounderTaskIdSchema.parse('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

function actions(): CofounderActions & {
  previewResearch: ReturnType<typeof vi.fn>;
  previewJob: ReturnType<typeof vi.fn>;
  previewDraftRevision: ReturnType<typeof vi.fn>;
  createFounderTask: ReturnType<typeof vi.fn>;
} {
  return {
    previewResearch: vi.fn(async () => ({ jobId })),
    previewJob: vi.fn(async () => ({ jobId })),
    previewDraftRevision: vi.fn(async () => ({ jobId })),
    createFounderTask: vi.fn(async () => ({ founderTaskId, title: 'Interview owners' })),
  };
}

describe('CofounderDecisionSchema', () => {
  it('rejects ask_targeted_question without whyNotResearchable', () => {
    const parsed = CofounderDecisionSchema.safeParse({
      action: 'ask_targeted_question',
      question: 'Who is the buyer?',
      text: 'Need the buyer.',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('dispatchCofounderDecision', () => {
  it('routes each decision variant to the matching service call and block kind', async () => {
    const routed = actions();
    const answer = await dispatchCofounderDecision(
      { action: 'answer', text: 'Close the books faster.' },
      routed,
      [],
    );
    expect(answer.blocks).toEqual([{ kind: 'concise_answer', text: 'Close the books faster.' }]);

    const question = await dispatchCofounderDecision(
      {
        action: 'ask_targeted_question',
        question: 'Who signs the cheque?',
        whyNotResearchable: 'Only the founder knows the buyer.',
        text: 'Need the buyer.',
      },
      routed,
      [],
    );
    expect(question.blocks[0]).toMatchObject({ kind: 'concise_answer' });
    expect(question.text).toBe('Need the buyer.');

    const research = await dispatchCofounderDecision(
      {
        action: 'start_research',
        objective: 'Find independent cafe owners',
        whyNow: 'Evidence is thin',
        text: 'I will research this.',
      },
      routed,
      [],
    );
    expect(routed.previewResearch).toHaveBeenCalledWith({
      objective: 'Find independent cafe owners',
      whyNow: 'Evidence is thin',
    });
    expect(research.blocks).toEqual([{ kind: 'research_plan', jobId }]);

    const job = await dispatchCofounderDecision(
      {
        action: 'create_job',
        objective: 'Draft alternatives',
        jobKind: 'analysis',
        whyNow: 'Need competitors',
        text: 'Starting analysis.',
      },
      routed,
      [],
    );
    expect(routed.previewJob).toHaveBeenCalledWith({
      objective: 'Draft alternatives',
      jobKind: 'analysis',
      whyNow: 'Need competitors',
    });
    expect(job.blocks).toEqual([{ kind: 'job_request', jobId }]);

    const draft = await dispatchCofounderDecision(
      {
        action: 'propose_draft_revision',
        objective: 'Update the problem section',
        text: 'Proposing a revision.',
      },
      routed,
      [],
    );
    expect(routed.previewDraftRevision).toHaveBeenCalledWith({
      objective: 'Update the problem section',
    });
    expect(draft.blocks).toEqual([{ kind: 'job_request', jobId }]);

    const task = await dispatchCofounderDecision(
      {
        action: 'create_founder_task',
        title: 'Interview owners',
        explanation: 'Capture non-friend interviews',
        text: 'Please interview three owners.',
      },
      routed,
      [],
    );
    expect(routed.createFounderTask).toHaveBeenCalledWith({
      title: 'Interview owners',
      explanation: 'Capture non-friend interviews',
    });
    expect(task.blocks).toEqual([{ kind: 'founder_task', founderTaskId }]);
  });
});
