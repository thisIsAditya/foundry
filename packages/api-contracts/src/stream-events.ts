import { z } from 'zod';

export const StreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('message_started'), runId: z.string() }),
  z.object({ type: z.literal('text_delta'), runId: z.string(), delta: z.string() }),
  z.object({ type: z.literal('question_ready'), runId: z.string(), question: z.unknown() }),
  z.object({ type: z.literal('tool_planned'), runId: z.string(), tool: z.unknown() }),
  z.object({ type: z.literal('tool_started'), runId: z.string(), toolCallId: z.string() }),
  z.object({
    type: z.literal('tool_progress'),
    runId: z.string(),
    toolCallId: z.string(),
    progress: z.unknown(),
  }),
  z.object({
    type: z.literal('tool_completed'),
    runId: z.string(),
    toolCallId: z.string(),
    result: z.unknown(),
  }),
  z.object({ type: z.literal('evidence_found'), runId: z.string(), evidence: z.unknown() }),
  z.object({ type: z.literal('proposal_ready'), runId: z.string(), proposal: z.unknown() }),
  z.object({ type: z.literal('approval_required'), runId: z.string(), approval: z.unknown() }),
  z.object({ type: z.literal('sprint_progress'), sprintId: z.string(), progress: z.unknown() }),
  z.object({ type: z.literal('artifact_ready'), artifactId: z.string(), version: z.number() }),
  z.object({ type: z.literal('warning'), runId: z.string(), warning: z.unknown() }),
  z.object({ type: z.literal('blocked'), runId: z.string(), reason: z.unknown() }),
  z.object({ type: z.literal('message_completed'), runId: z.string() }),
  z.object({
    type: z.literal('job_state_changed'),
    jobId: z.string(),
    fromStatus: z.string(),
    toStatus: z.string(),
  }),
  z.object({
    type: z.literal('founder_task_created'),
    founderTaskId: z.string(),
    title: z.string(),
  }),
  z.object({
    type: z.literal('score_changed'),
    projectId: z.string(),
    revisionId: z.string(),
    overall: z.number(),
    dimensions: z.unknown(),
    deltaFromPrevious: z.number().nullable(),
  }),
  z.object({
    type: z.literal('conversation_message_appended'),
    messageId: z.string(),
    actor: z.string(),
  }),
  z.object({
    type: z.literal('cofounder_started'),
    operationId: z.string(),
    projectId: z.string(),
  }),
  z.object({
    type: z.literal('cofounder_waiting'),
    operationId: z.string(),
    projectId: z.string(),
  }),
  z.object({
    type: z.literal('capability_completed'),
    operationId: z.string(),
    capabilityName: z.string(),
  }),
  z.object({
    type: z.literal('proposal_ready_v4'),
    operationId: z.string(),
    proposalId: z.string(),
  }),
  z.object({
    type: z.literal('journey_step_suggested'),
    operationId: z.string(),
    stepId: z.string(),
  }),
  z.object({
    type: z.literal('cofounder_completed'),
    operationId: z.string(),
    projectId: z.string(),
  }),
  z.object({
    type: z.literal('cofounder_failed'),
    operationId: z.string(),
    projectId: z.string(),
    category: z.string(),
  }),
  z.object({
    type: z.literal('cofounder_canceled'),
    operationId: z.string(),
    projectId: z.string(),
  }),
]);
export type StreamEvent = z.infer<typeof StreamEventSchema>;
