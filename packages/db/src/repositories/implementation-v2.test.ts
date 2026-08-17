import { randomUUID } from 'node:crypto';

import { PackRevisionIdSchema, SprintContractIdSchema, SprintIdSchema } from '@foundry/domain';
import { describe, expect, it } from 'vitest';

import { insertBeachhead } from './beachheads.js';
import { insertCitation } from './citations.js';
import { insertConversationMessage } from './conversation-messages.js';
import { insertConversationSummary } from './conversation-summaries.js';
import { insertEvidenceItem } from './evidence-items.js';
import { insertAssumption } from './assumptions.js';
import { insertAlternative } from './alternatives.js';
import { insertBusinessModel } from './business-models.js';
import { insertCompetitor } from './competitors.js';
import { insertContentBlock } from './content-blocks.js';
import { insertDocument, updateDocumentLatestSnapshot } from './documents.js';
import { insertFounderTask } from './founder-tasks.js';
import { upsertFounderPreference } from './founder-preferences.js';
import { insertCurrentMoneyRules } from './money-rules.js';
import { insertOffer } from './offers.js';
import { insertPackRevision } from './pack-revisions.js';
import { insertPlanScore } from './plan-scores.js';
import { insertProblem } from './problems.js';
import { insertPersona } from './personas.js';
import { insertProject } from './projects.js';
import { insertResearchFinding } from './research-findings.js';
import { insertSourceSnapshot } from './source-snapshots.js';
import { insertSource } from './sources.js';
import { insertSprint } from './sprints.js';
import { insertUser } from './users.js';
import { insertWedge } from './wedges.js';
import { insertWorkspace } from './workspaces.js';
import { withWorkspaceScope } from '../rls.js';
import { sql } from '../test/harness.js';

describe('implementation v2 repositories', () => {
  it('round-trips conversation, evidence, score, and projection tables', async () => {
    const owner = await insertUser(sql, {
      name: 'Owner',
      email: `v2-${randomUUID()}@example.com`,
    });
    const workspace = await insertWorkspace(sql, {
      name: 'V2',
      ownerUserId: owner.id,
    });
    const project = await insertProject(sql, {
      workspaceId: workspace.id,
      name: 'Venture',
    });

    await withWorkspaceScope(sql, [workspace.id], async (tx) => {
      const pack = await insertPackRevision(tx, {
        projectId: project.id,
        revisionNumber: 1,
        actorType: 'founder',
        actorId: owner.id,
        proposedChanges: { clarifications: [] },
      });
      const head = await insertBeachhead(tx, {
        packRevisionId: pack.id,
        segmentDefinition: 'SMB retailers',
      });
      const problem = await insertProblem(tx, {
        packRevisionId: pack.id,
        statement: 'Inventory shrink is rising',
      });
      const moneyRules = await insertCurrentMoneyRules(tx, {
        projectId: project.id,
        packRevisionId: pack.id,
        currency: 'INR',
        unitOfSale: 'store-month',
        price: '4999',
        costStructure: {
          cogs: '1200',
          variableCostPerUnit: '200',
          cac: '800',
          lifetimePeriods: 24,
        },
      });
      const businessModel = await insertBusinessModel(tx, {
        packRevisionId: pack.id,
        moneyRulesId: moneyRules.id,
        whoReceivesValue: 'Store owner',
        whoPays: 'Store owner',
        unitOfSale: 'store-month',
        deliveryMechanism: 'SaaS dashboard',
        revenuePattern: 'subscription',
      });
      await insertOffer(tx, {
        businessModelId: businessModel.id,
        promise: 'Cut shrink by 20%',
        packageDescription: 'Monthly analytics',
        price: {
          amount: '4999',
          currency: 'INR',
          taxIncluded: false,
          effectiveDate: new Date('2026-04-01T00:00:00.000Z'),
        },
      });

      const source = await insertSource(tx, {
        projectId: project.id,
        kind: 'url',
        sourceCategory: 'market_report',
        geographicScope: 'IN',
        status: 'ready',
      });
      const snapshot = await insertSourceSnapshot(tx, {
        sourceId: source.id,
        contentHash: 'hash-1',
        parserMetadata: { parser: 'html' },
      });
      const document = await insertDocument(tx, {
        sourceId: source.id,
        title: 'report',
      });
      await updateDocumentLatestSnapshot(tx, document.id, snapshot.id, 'report');
      const block = await insertContentBlock(tx, {
        documentId: document.id,
        sourceSnapshotId: snapshot.id,
        blockType: 'text',
        sequenceNo: 0,
        textContent: 'Market growing 12% YoY',
        locator: { sourceSnapshotId: snapshot.id, paragraph: 0 },
      });
      const citation = await insertCitation(tx, {
        sourceSnapshotId: snapshot.id,
        contentBlockId: block.id,
        locator: { sourceSnapshotId: snapshot.id, paragraph: 0 },
      });
      const evidenceItem = await insertEvidenceItem(tx, {
        projectId: project.id,
        summary: 'Market growing 12% YoY',
        provenance: {
          kind: 'externally_verified',
          sourceIds: [source.id],
          sourceSnapshotIds: [snapshot.id],
          citationIds: [citation.id],
          verifiedAt: null,
        },
        citationIds: [citation.id],
      });
      await insertPersona(tx, {
        packRevisionId: pack.id,
        beachheadId: head.id,
        profile: 'Owner-operator with 3 locations',
        evidenceItemIds: [evidenceItem.id],
      });
      await insertAssumption(tx, {
        projectId: project.id,
        statement: 'Shrink is primarily theft',
      });
      await insertAlternative(tx, {
        projectId: project.id,
        packRevisionId: pack.id,
        problemId: problem.id,
        description: 'Manual spot checks',
      });
      await insertCompetitor(tx, {
        projectId: project.id,
        name: 'Legacy POS vendor',
        sourceIds: [source.id],
      });
      await insertWedge(tx, {
        packRevisionId: pack.id,
        statement: 'Real-time shrink alerts beat monthly audits',
        evidenceItemIds: [evidenceItem.id],
      });

      const sprintId = SprintIdSchema.parse(randomUUID());
      const sprint = await insertSprint(tx, {
        id: sprintId,
        projectId: project.id,
        jobKind: 'research',
        owner: 'ai',
        contract: {
          id: SprintContractIdSchema.parse(randomUUID()),
          sprintId,
          objective: 'Validate market growth',
          whyNow: 'Need evidence for beachhead',
          owner: 'ai',
          jobKind: 'research',
          parentJobId: null,
          phase: 'diagnose',
          packRevisionId: PackRevisionIdSchema.parse(pack.id),
          relevantEvidence: [],
          inputs: {},
          outputSchema: { name: 'SprintSynthesis', version: 1 },
          toolAllowlist: [],
          riskPolicy: 'compute',
          budget: {
            provider: 'anthropic',
            modelOrTool: 'mock',
            inputEstimate: '0',
            outputEstimate: '0',
            currency: 'USD',
            uncertainty: 'n/a',
          },
          qualityChecks: ['gate_a'],
          stopConditions: ['max_stalls'],
          promptVersion: 'orchestrator:1',
          maxWorkers: 1,
          maxStalls: 2,
          workers: [{ name: 'mock_worker', readsOnly: true, writeTargets: [] }],
          gateType: 'gate_a',
          createdAt: new Date('2026-04-01T00:00:00.000Z'),
        },
      });
      expect(sprint.jobKind).toBe('research');

      await insertResearchFinding(tx, {
        projectId: project.id,
        jobId: sprint.id,
        claim: 'Market growing 12% YoY',
        citationIds: [citation.id],
        confidence: {
          label: 'medium',
          basis: 'single report',
          reviewerUserId: null,
          expiresAt: null,
        },
        affectedSectionKeys: ['market_model'],
        extractionMethod: 'market_report',
      });

      const message = await insertConversationMessage(tx, {
        projectId: project.id,
        actor: 'co_founder',
        text: 'Here is what we found so far.',
        blocks: [{ kind: 'concise_answer', text: 'Market is growing.' }],
      });
      await insertConversationSummary(tx, {
        projectId: project.id,
        summaryText: 'Discussed market growth',
        coveredThroughMessageId: message.id,
        tokenCount: 42,
      });
      await upsertFounderPreference(tx, {
        scope: { type: 'project', projectId: project.id },
        key: 'preferred_currency',
        value: 'INR',
        confidence: {
          label: 'high',
          basis: 'founder stated',
          reviewerUserId: owner.id,
          expiresAt: null,
        },
        founderConfirmed: true,
      });
      await insertFounderTask(tx, {
        projectId: project.id,
        title: 'Interview 3 store owners',
        explanation: 'Validate shrink pain',
        linkedJobId: sprint.id,
        linkedSectionKeys: ['evidence_ledger'],
        linkedScoreDimensions: ['evidence_strength'],
      });
      await insertPlanScore(tx, {
        packRevisionId: pack.id,
        overall: 62.5,
        dimensions: {
          customer_clarity: { raw: 3, weight: 15, contribution: 9, basis: 'known' },
          evidence_strength: { raw: 3.5, weight: 20, contribution: 14, basis: 'known' },
          market_support: { raw: 3, weight: 15, contribution: 9, basis: 'known' },
          business_economics: { raw: 3.25, weight: 15, contribution: 9.75, basis: 'known' },
          willingness_to_pay: {
            raw: 2.5,
            weight: 15,
            contribution: 7.5,
            basis: 'insufficient_data',
          },
          execution_readiness: { raw: 2.9, weight: 10, contribution: 5.8, basis: 'known' },
          risk_control: { raw: 3.1, weight: 10, contribution: 6.2, basis: 'known' },
        },
        ruleVersion: 'v2-alpha',
        reasons: [{ dimension: 'willingness_to_pay', message: 'No WTP interviews yet' }],
        topActions: [
          { dimension: 'evidence_strength', action: 'Add 2 founder interviews', expectedImpact: 8 },
        ],
      });
    });
  });
});
