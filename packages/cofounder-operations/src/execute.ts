import {
  collectCapabilityReferenceIds,
  collectEnvelopeReferenceIds,
  isKnownReference,
  type CofounderRuntimeResult,
} from '@foundry/agent-runtime';
import type { CofounderTurn } from '@foundry/api-contracts';
import {
  isCancelableCofounderOperationState,
  isTerminalCofounderOperationState,
  toCofounderTurnBlock,
  ConversationReferenceSchema,
  type CofounderOperation,
  type CofounderOperationId,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';

import type { CofounderOperationPorts, ExecuteCofounderOperationInput } from './ports.js';
import { parseOperationRecovery, replayedTurn } from './recovery.js';

function canceledError(): AppError {
  return new AppError({
    code: 'workflow_paused',
    explanation: 'The co-founder turn was canceled.',
    nextAction: 'Retry when you want to continue. Accepted record state is unchanged.',
  });
}

export function inProgressTurn(
  operation: CofounderOperation,
  input: { founderRequest?: string; stepId?: string | null },
): CofounderTurn {
  return {
    explanation:
      'The co-founder is working. Accepted record state stays unchanged until you review a proposal.',
    interactionType: 'inform',
    references: [],
    facts: [],
    interpretation: '',
    assumptions: [],
    uncertainty: 'This turn is still running.',
    blockedConditions: [],
    activity: 'Queued or running. No accepted record write has occurred.',
    proposalId: null,
    stepId: input.stepId ?? null,
    operation,
  };
}

export async function executeCofounderOperation(
  ports: CofounderOperationPorts,
  input: ExecuteCofounderOperationInput,
): Promise<CofounderTurn> {
  const loaded = await ports.operations.getById(input.operationId);
  if (loaded === null) {
    throw new AppError({
      code: 'not_found',
      explanation: 'That co-founder operation was not found.',
      nextAction: 'Refresh the co-founder view.',
    });
  }
  if (isTerminalCofounderOperationState(loaded.state) || loaded.state === 'awaiting_founder') {
    if (loaded.state === 'canceled' || loaded.state === 'timed_out') {
      throw canceledError();
    }
    if (loaded.state === 'failed') {
      throw new AppError({
        code: 'workflow_failed',
        explanation: 'The original co-founder turn failed. Accepted record state is unchanged.',
        nextAction: 'Send a new message to retry.',
      });
    }
    return replayedTurn(loaded) ?? inProgressTurn(loaded, { stepId: input.stepId ?? null });
  }

  let operation = loaded;
  if (operation.state === 'queued') {
    const claimed = await ports.operations.claimQueued(operation.id);
    if (claimed === null) {
      const latest = await ports.operations.getById(operation.id);
      if (latest === null) {
        throw new AppError({
          code: 'not_found',
          explanation: 'That co-founder operation was not found.',
          nextAction: 'Refresh the co-founder view.',
        });
      }
      if (isTerminalCofounderOperationState(latest.state) || latest.state === 'awaiting_founder') {
        return executeCofounderOperation(ports, input);
      }
      return inProgressTurn(latest, { stepId: input.stepId ?? null });
    }
    operation = claimed;
  }

  const abort = new AbortController();
  const unsubscribe = ports.cancel.subscribe(operation.id, () => abort.abort());
  const recovery = parseOperationRecovery(operation.recovery);
  await ports.operations.updateState(operation.id, {
    state: 'running',
    recovery: {
      ...recovery,
      attempt: (recovery.attempt ?? 0) + 1,
      executor: input.executor,
      claimedAt: new Date().toISOString(),
    },
  });
  await ports.events.publish({
    type: 'cofounder_started',
    operationId: operation.id,
    projectId: operation.projectId,
  });

  try {
    if (abort.signal.aborted || (await ports.cancel.isSignaled(operation.id))) {
      throw canceledError();
    }
    const packet = await ports.context.buildPacket(input.correlationId);
    const knownIds = collectEnvelopeReferenceIds(packet);
    const capabilities = {
      async invoke(request: { name: string; input: unknown; operationId: string }) {
        const invoked = await ports.capabilities.invoke(request);
        for (const ref of collectCapabilityReferenceIds(invoked.data)) {
          knownIds.add(`${ref.kind}:${ref.id}`);
          knownIds.add(ref.id);
        }
        await ports.events.publish({
          type: 'capability_completed',
          operationId: operation.id,
          capabilityName: request.name,
        });
        return invoked;
      },
    };
    const issued =
      ports.tokens === undefined
        ? null
        : await ports.tokens.issue({
            operationId: operation.id,
            allowedCapabilities: packet.allowedCapabilities,
            maxInvocations: packet.capabilityBudget.maxInvocations,
          });
    if (abort.signal.aborted || (await ports.cancel.isSignaled(operation.id))) {
      throw canceledError();
    }
    const rawResult = await ports.runtime.run({
      operationId: operation.id,
      actor: packet.actor,
      contextPacket: packet,
      founderRequest: input.founderRequest,
      schemaVersion: 'v5',
      capabilityManifest: packet.allowedCapabilities,
      timeoutMs: input.timeoutMs,
      abortSignal: abort.signal,
      capabilities,
      ...(issued === null
        ? {}
        : { capabilityToken: issued.token, capabilityInvokeUrl: issued.invokeUrl }),
    });
    if (abort.signal.aborted || (await ports.cancel.isSignaled(operation.id))) {
      throw canceledError();
    }
    const result = groundRuntimeResult(rawResult, knownIds);
    const proposalId = await persistProposalDraft(ports, operation, result);
    const suggestedStepIds = await persistSuggestedSteps(ports, operation, result);
    const current = await ports.operations.getById(operation.id);
    if (current?.state === 'canceled' || abort.signal.aborted) {
      throw canceledError();
    }
    const terminalState = proposalId === null ? 'completed' : 'awaiting_founder';
    const stepId = input.stepId ?? suggestedStepIds[0] ?? null;
    const turn: CofounderTurn = {
      explanation: result.explanation,
      interactionType: result.interactionType,
      references: result.references,
      facts: result.facts,
      interpretation: result.interpretation,
      assumptions: result.assumptions,
      ...(result.recommendation === undefined ? {} : { recommendation: result.recommendation }),
      uncertainty: result.uncertainty,
      blockedConditions: result.blockedConditions,
      activity: result.activity,
      proposalId,
      stepId,
      operation: current,
    };
    const cofounderMessage = await ports.messages.insert({
      actor: 'co_founder',
      text: result.explanation,
      blocks: [
        toCofounderTurnBlock({
          interactionType: result.interactionType,
          explanation: result.explanation,
          uncertainty: result.uncertainty,
          blockedConditions: result.blockedConditions,
          activity: result.activity,
          proposalId,
          stepId,
          operationId: operation.id,
          references: result.references,
          operationState: terminalState,
          facts: result.facts,
          interpretation: result.interpretation,
          assumptions: result.assumptions,
          ...(result.recommendation === undefined ? {} : { recommendation: result.recommendation }),
        }),
        ...(result.artifact === undefined
          ? []
          : [
              {
                kind: 'draft_action' as const,
                text: `## ${result.artifact.title}\n\n${result.artifact.content}`,
              },
            ]),
      ],
      references: result.references.flatMap((ref) => {
        const parsed = ConversationReferenceSchema.safeParse(ref);
        return parsed.success ? [parsed.data] : [];
      }),
    });
    await ports.events.publish({
      type: 'conversation_message_appended',
      messageId: cofounderMessage.id,
      actor: 'co_founder',
    });
    const storedTurn = { ...turn, operation: null };
    const completed = await ports.operations.updateState(operation.id, {
      state: terminalState,
      recovery: {
        ...recovery,
        turn: storedTurn,
        cofounderMessageId: cofounderMessage.id,
        proposalId,
        executor: input.executor,
      },
    });
    if (terminalState === 'awaiting_founder') {
      await ports.events.publish({
        type: 'cofounder_waiting',
        operationId: operation.id,
        projectId: operation.projectId,
      });
    } else {
      await ports.events.publish({
        type: 'cofounder_completed',
        operationId: operation.id,
        projectId: operation.projectId,
      });
    }
    return { ...turn, operation: completed };
  } catch (error) {
    const paused = error instanceof AppError && error.code === 'workflow_paused';
    if (isCancelableCofounderOperationState(operation.state) || operation.state === 'running') {
      await ports.operations.updateState(operation.id, {
        state: paused ? 'canceled' : 'failed',
        recovery: { ...recovery, category: paused ? 'canceled' : 'runtime_error' },
        ...(paused ? { canceledAt: new Date() } : {}),
      });
    }
    if (ports.tokens !== undefined) {
      await ports.tokens.cancel(operation.id);
    }
    if (!paused) {
      await insertFailureMessage(ports, error).catch(() => undefined);
    }
    await ports.events.publish(
      paused
        ? {
            type: 'cofounder_canceled',
            operationId: operation.id,
            projectId: operation.projectId,
          }
        : {
            type: 'cofounder_failed',
            operationId: operation.id,
            projectId: operation.projectId,
            category: 'runtime_error',
          },
    );
    throw error;
  } finally {
    unsubscribe();
  }
}

async function insertFailureMessage(ports: CofounderOperationPorts, error: unknown): Promise<void> {
  const text =
    error instanceof AppError
      ? error.explanation
      : 'The co-founder could not complete this turn. Accepted record state is unchanged.';
  const message = await ports.messages.insert({
    actor: 'co_founder',
    text,
    blocks: [{ kind: 'concise_answer', text }],
  });
  await ports.events.publish({
    type: 'conversation_message_appended',
    messageId: message.id,
    actor: 'co_founder',
  });
}

async function persistProposalDraft(
  ports: CofounderOperationPorts,
  operation: CofounderOperation,
  result: CofounderRuntimeResult,
): Promise<string | null> {
  if (result.proposalDraft === undefined || result.proposalDraft.changes.length === 0) {
    return null;
  }
  const created = await ports.capabilities.invoke({
    name: 'proposal.createDraft@1',
    input: {
      projectId: operation.projectId,
      rationale: result.proposalDraft.rationale,
      interactionType: result.interactionType,
      changes: result.proposalDraft.changes.map((change) => ({
        section: change.section,
        afterPayload: change.afterPayload,
        evidenceRefs: change.evidenceRefs,
        ...(change.itemKey === undefined ? {} : { itemKey: change.itemKey }),
        ...(change.rationale === undefined ? {} : { rationale: change.rationale }),
      })),
      idempotencyKey: proposalIdempotencyKey(operation.id),
      ...(result.proposalDraft.uncertainty === undefined
        ? {}
        : { uncertainty: result.proposalDraft.uncertainty }),
    },
    operationId: operation.id,
  });
  await ports.events.publish({
    type: 'capability_completed',
    operationId: operation.id,
    capabilityName: 'proposal.createDraft@1',
  });
  const proposalId = typeof created.data?.proposalId === 'string' ? created.data.proposalId : null;
  if (proposalId !== null) {
    await ports.events.publish({
      type: 'proposal_ready_v4',
      operationId: operation.id,
      proposalId,
    });
  }
  return created.ok ? proposalId : null;
}

async function persistSuggestedSteps(
  ports: CofounderOperationPorts,
  operation: CofounderOperation,
  result: CofounderRuntimeResult,
): Promise<string[]> {
  if (result.suggestedSteps === undefined || result.suggestedSteps.length === 0) {
    return [];
  }
  const ids = await ports.suggestions.persist({ steps: result.suggestedSteps });
  for (const stepId of ids) {
    await ports.events.publish({
      type: 'journey_step_suggested',
      operationId: operation.id,
      stepId,
    });
  }
  return ids;
}

function groundRuntimeResult(
  result: CofounderRuntimeResult,
  knownIds: Set<string>,
): CofounderRuntimeResult {
  const references = result.references.filter((ref) => isKnownReference(ref, knownIds));
  const incomingFacts = result.facts ?? [];
  const facts = [];
  const demoted: string[] = [...(result.assumptions ?? [])];
  for (const fact of incomingFacts) {
    const validRefs = fact.references.filter((ref) => isKnownReference(ref, knownIds));
    if (validRefs.length === 0) {
      demoted.push(fact.statement);
      continue;
    }
    facts.push({ statement: fact.statement, references: validRefs });
  }
  const incomingInterpretation = result.interpretation ?? '';
  const interpretation =
    facts.length < incomingFacts.length && incomingInterpretation.length === 0
      ? 'Some claimed facts had no stored reference and were treated as interpretation.'
      : incomingInterpretation;
  return {
    ...result,
    references,
    facts,
    interpretation,
    assumptions: demoted,
  };
}

export function proposalIdempotencyKey(operationId: CofounderOperationId): string {
  return operationId;
}
