import type { ConversationReference } from '@foundry/domain';

import {
  DEFAULT_ITEM_CAP,
  DEFAULT_MESSAGE_WINDOW,
  capWithProvenance,
  dedupeStatements,
  describeDraftStatus,
  windowMessages,
} from './selection-rules.js';
import type { AgentContextPacket, AssembleContextInput, DroppedContextItem } from './types.js';

/**
 * Builds the full `AgentContextPacket` from already-loaded plan/conversation state. Unlike the
 * old `assembleCofounderContext`/`formatCofounderContext` pair, nothing loaded onto the
 * `PackSnapshot` (beachheads, DMUs, personas, problems, assumptions, decisions, pack sections,
 * a pending draft revision) is dropped here — selection only trims *within* a category via the
 * doc-specified rules (accepted beats draft, de-dupe, provenance for drops), never a whole
 * category outright. Real token-budget trimming is `BudgetAllocator`/`ContextCompressor`'s job
 * (milestone 2); this class's caps are a generous backstop.
 */
export class ContextAssembler {
  assemble(input: AssembleContextInput): AgentContextPacket {
    const messageWindow = input.messageWindow ?? DEFAULT_MESSAGE_WINDOW;
    const recentMessages = windowMessages(input.recentMessages, messageWindow);
    const dedupedAssumptions = dedupeStatements(input.snapshot.assumptions);
    const dedupedProblems = dedupeStatements(input.snapshot.problems);

    const droppedItems: DroppedContextItem[] = [];
    const cap = <T>(kind: string, items: readonly T[], idOf: (item: T) => string): T[] => {
      const { kept, dropped } = capWithProvenance(items, DEFAULT_ITEM_CAP, (item) => ({
        kind,
        id: idOf(item),
        reason: `exceeded per-category cap of ${DEFAULT_ITEM_CAP}`,
      }));
      droppedItems.push(...dropped);
      return kept;
    };

    const interviews = cap('interview', input.snapshot.interviews, (item) => item.id);
    const quotes = cap('quote', input.snapshot.quotes, (item) => item.id);
    const beachheads = cap('beachhead', input.snapshot.beachheads, (item) => item.id);
    const dmus = cap('dmu', input.snapshot.dmus, (item) => item.id);
    const personas = cap('persona', input.snapshot.personas, (item) => item.id);
    const problems = cap('problem', dedupedProblems, (item) => item.id);
    const assumptions = cap('assumption', dedupedAssumptions, (item) => item.id);
    const decisions = cap('decision', input.snapshot.decisions, (item) => item.id);
    const marketModels = cap('market_model', input.snapshot.marketModels, (item) => item.id);
    const unitEconomics = cap('unit_economics', input.snapshot.unitEconomics, (item) => item.id);
    const wtpEvents = cap('wtp_event', input.snapshot.wtpEvents, (item) => item.id);
    const recentJobs = cap('job', input.recentJobs, (item) => item.id);
    const openFounderTasks = cap('founder_task', input.openFounderTasks, (item) => item.id);

    const contextItemsUsed: ConversationReference[] = [];
    contextItemsUsed.push({ kind: 'revision', id: input.snapshot.pack.id });
    if (input.snapshot.pendingDraftRevision !== null) {
      contextItemsUsed.push({ kind: 'revision', id: input.snapshot.pendingDraftRevision.id });
    }
    for (const message of recentMessages) {
      contextItemsUsed.push(...message.references);
    }
    for (const task of openFounderTasks) {
      contextItemsUsed.push({ kind: 'founder_task', id: task.id });
    }
    for (const job of recentJobs) {
      contextItemsUsed.push({ kind: 'job', id: job.id });
    }
    for (const evidence of input.attachedEvidence) {
      contextItemsUsed.push({ kind: 'evidence', id: evidence.id });
    }
    for (const decision of decisions) {
      contextItemsUsed.push({ kind: 'decision', id: decision.id });
    }

    return {
      ...input.snapshot,
      interviews,
      quotes,
      beachheads,
      dmus,
      personas,
      problems,
      assumptions,
      decisions,
      marketModels,
      unitEconomics,
      wtpEvents,
      projectId: input.projectId,
      planScore: input.planScore,
      recentMessages,
      conversationSummary: input.conversationSummary,
      confirmedPreferences: [...input.confirmedPreferences],
      openFounderTasks,
      recentJobs,
      attachedEvidence: [...input.attachedEvidence],
      contextItemsUsed,
      droppedItems,
    };
  }

  /**
   * Renders the packet into a prompt-ready string. Structured (labeled sections) rather than one
   * flat JSON blob, and — critically — covers every category on `AgentContextPacket`, so the
   * model can actually see the plan it already has instead of re-deriving or forgetting it.
   */
  format(context: AgentContextPacket): string {
    const sections: string[] = [];
    const effectivePhase = context.derivedPhase ?? context.phase;
    sections.push(
      `## Plan state\nJourney phase: ${effectivePhase}\nAccepted pack revision: #${context.pack.revisionNumber} (${context.pack.id})\n${describeDraftStatus(context.pendingDraftRevision !== null)}`,
    );
    if (context.conversationSummary !== null) {
      sections.push(
        `## Conversation summary (older messages)\n${context.conversationSummary.summaryText}`,
      );
    }
    if (context.recentMessages.length > 0) {
      sections.push(
        [
          '## Recent conversation',
          ...context.recentMessages.map((message) => `- [${message.actor}] ${message.text}`),
        ].join('\n'),
      );
    }
    if (context.planScore !== null) {
      sections.push(
        `## Plan score\nOverall: ${context.planScore.overall}/100\nTop actions: ${
          context.planScore.topActions.map((action) => action.action).join('; ') || 'none'
        }`,
      );
    }
    if (context.problems.length > 0) {
      sections.push(listSection('Problems on file', context.problems, (item) => item.statement));
    }
    if (context.personas.length > 0) {
      sections.push(listSection('Personas', context.personas, (item) => item.profile));
    }
    if (context.beachheads.length > 0) {
      sections.push(
        listSection('Beachheads', context.beachheads, (item) => item.segmentDefinition),
      );
    }
    if (context.dmus.length > 0) {
      sections.push(
        listSection(
          'Decision-making units (DMU)',
          context.dmus,
          (item) =>
            `buyer=${item.buyer ?? 'unknown'} champion=${item.champion ?? 'unknown'} approver=${item.approver ?? 'unknown'} veto=${item.veto ?? 'unknown'}`,
        ),
      );
    }
    if (context.interviews.length > 0) {
      const nonFriend = context.interviews.filter(
        (item) => item.participantType === 'non_friend',
      ).length;
      sections.push(
        `## Interviews\n${context.interviews.length} on file (${nonFriend} non-friend). ${context.quotes.length} quotes captured.`,
      );
    }
    if (context.moneyRules !== null) {
      sections.push(
        `## Money rules\nPrice: ${context.moneyRules.price} ${context.moneyRules.currency} per ${context.moneyRules.unitOfSale}${
          context.moneyRules.billingFrequency === null
            ? ''
            : ` (${context.moneyRules.billingFrequency})`
        }`,
      );
    }
    if (context.marketModels.length > 0) {
      sections.push(`## Market models\n${JSON.stringify(context.marketModels)}`);
    }
    if (context.unitEconomics.length > 0) {
      sections.push(`## Unit economics\n${JSON.stringify(context.unitEconomics)}`);
    }
    if (context.wtpEvents.length > 0) {
      sections.push(`## Willingness-to-pay events\n${context.wtpEvents.length} recorded.`);
    }
    if (context.assumptions.length > 0) {
      sections.push(
        listSection(
          'Assumptions',
          context.assumptions,
          (item) => `[${item.status}] ${item.statement}`,
        ),
      );
    }
    if (context.decisions.length > 0) {
      sections.push(
        listSection(
          'Past decisions',
          context.decisions,
          (item) => item.rationale ?? JSON.stringify(item.chosen),
        ),
      );
    }
    if (context.packSections.length > 0) {
      sections.push(
        listSection('Pack sections on file', context.packSections, (item) => item.section),
      );
    }
    if (context.clarifications.length > 0) {
      sections.push(
        listSection(
          'Founder clarifications',
          context.clarifications,
          (item) => `Q:${item.questionId} A:${item.answer}`,
        ),
      );
    }
    if (context.confirmedPreferences.length > 0) {
      sections.push(
        listSection(
          'Confirmed founder preferences',
          context.confirmedPreferences,
          (item) => `${item.key}: ${JSON.stringify(item.value)}`,
        ),
      );
    }
    if (context.openFounderTasks.length > 0) {
      sections.push(
        listSection('Open founder tasks', context.openFounderTasks, (item) => item.title),
      );
    }
    if (context.recentJobs.length > 0) {
      sections.push(
        listSection(
          'Recent/active jobs',
          context.recentJobs,
          (item) =>
            `[${item.status}] ${item.objective}${
              item.synthesisSummary === undefined ? '' : ` — ${item.synthesisSummary}`
            }`,
        ),
      );
    }
    if (context.attachedEvidence.length > 0) {
      sections.push(
        listSection(
          'Evidence attached to this message',
          context.attachedEvidence,
          (item) => item.summary,
        ),
      );
    }
    return sections.join('\n\n');
  }
}

function listSection<T>(title: string, items: readonly T[], render: (item: T) => string): string {
  return [`## ${title}`, ...items.map((item) => `- ${render(item)}`)].join('\n');
}
