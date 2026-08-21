import {
  createMemoryStreamBus,
  createRedisStreamBus,
  createSecretBox,
  probeProviderCapabilities,
  type McpClientFactory,
  type ProviderSecrets,
  type SecretBox,
  type StreamBus,
} from '@foundry/agent-runtime';
import { listWorkspaceMembershipsByUserId, type PoolSql } from '@foundry/db';
import { UserIdSchema, type UserId, type WorkspaceMembership } from '@foundry/domain';
import { PolicyService } from '@foundry/policy';
import type { LanguageModel } from 'ai';
import { randomUUID } from 'node:crypto';

import { headersWithAccessKey } from '../lib/access-key';
import { getAuth } from '../lib/auth';
import { getEnv } from '../lib/env';
import { getSql } from '../lib/sql';
import { getCoordinationStore, type CoordinationStore } from './coordination';
import { createBullmqJobQueue, createMemoryJobQueue, type JobQueue } from './queue/job-queue';
import { ArtifactService } from './services/artifact-service';
import { ApprovalService } from './services/approval-service';
import { ConversationService } from './services/conversation-service';
import { DecisionService } from './services/decision-service';
import { DocumentService } from './services/document-service';
import { ExperimentService } from './services/experiment-service';
import { FounderTaskService } from './services/founder-task-service';
import { InitialDraftService } from './services/initial-draft-service';
import { IntegrationService } from './services/integration-service';
import { InterviewService } from './services/interview-service';
import { JobService } from './services/job-service';
import { McpServerService } from './services/mcp-server-service';
import { MemberService } from './services/member-service';
import { MetricService } from './services/metric-service';
import { MoneyRulesService } from './services/money-rules-service';
import { PackService } from './services/pack-service';
import { PlanSectionAggregatorService } from './services/plan-section-aggregator';
import { ProjectService } from './services/project-service';
import { ProviderService, type CapabilityProbe } from './services/provider-service';
import { ResearchFindingService } from './services/research-finding-service';
import { ScoringService } from './services/scoring-service';
import { SprintService } from './services/sprint-service';
import { WorkspaceService } from './services/workspace-service';
import { createMemoryObjectStore, type ObjectStore } from './storage/object-store';
import { createS3ObjectStore } from './storage/s3-object-store';

export type AuthSession = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string | null;
  };
} | null;

export type Actor =
  { type: 'anonymous' } | { type: 'user'; userId: UserId; memberships: WorkspaceMembership[] };

export type ServiceContainer = {
  policyService: PolicyService;
  workspaceService: WorkspaceService;
  projectService: ProjectService;
  documentService: DocumentService;
  interviewService: InterviewService;
  providerService: ProviderService;
  mcpServerService: McpServerService;
  sprintService: SprintService;
  moneyRulesService: MoneyRulesService;
  experimentService: ExperimentService;
  artifactService: ArtifactService;
  packService: PackService;
  approvalService: ApprovalService;
  decisionService: DecisionService;
  metricService: MetricService;
  integrationService: IntegrationService;
  memberService: MemberService;
  scoringService: ScoringService;
  founderTaskService: FounderTaskService;
  conversationService: ConversationService;
  jobService: JobService;
  planSectionAggregatorService: PlanSectionAggregatorService;
  initialDraftService: InitialDraftService;
  researchFindingService: ResearchFindingService;
};

export type Context = {
  sql: PoolSql;
  actor: Actor;
  session: AuthSession;
  correlationId: string;
  coordination: CoordinationStore;
  services: ServiceContainer;
  clientIp: string;
  objectStore: ObjectStore;
  jobQueue: JobQueue;
  streamBus: StreamBus;
};

export type ServiceExtras = {
  objectStore: ObjectStore;
  jobQueue: JobQueue;
  streamBus: StreamBus;
  secretBox: SecretBox;
  secrets: ProviderSecrets;
  languageModel?: LanguageModel;
  capabilityProbe?: CapabilityProbe;
  mcpFactory?: McpClientFactory;
  allowMcpLoopback?: boolean;
};

export function createServices(
  sql: PoolSql,
  coordination: CoordinationStore,
  policyService: PolicyService,
  extras: ServiceExtras,
): ServiceContainer {
  const providerService = new ProviderService(
    sql,
    coordination,
    policyService,
    extras.secretBox,
    extras.secrets,
    extras.capabilityProbe ?? probeProviderCapabilities,
  );
  const planSectionAggregatorService = new PlanSectionAggregatorService(sql, policyService);
  const scoringService = new ScoringService(sql, extras.streamBus, extras.jobQueue);
  const founderTaskService = new FounderTaskService(
    sql,
    coordination,
    policyService,
    extras.streamBus,
    extras.jobQueue,
  );
  const sprintService = new SprintService(
    sql,
    coordination,
    policyService,
    extras.jobQueue,
    extras.streamBus,
  );
  const conversationService = new ConversationService(
    sql,
    coordination,
    policyService,
    {
      streamBus: extras.streamBus,
      secretBox: extras.secretBox,
      secrets: extras.secrets,
      ...(extras.languageModel === undefined ? {} : { languageModel: extras.languageModel }),
      allowMcpLoopback: extras.allowMcpLoopback === true,
    },
    sprintService,
    founderTaskService,
    scoringService,
    planSectionAggregatorService,
  );
  const initialDraftService = new InitialDraftService(
    sql,
    extras.streamBus,
    sprintService,
    founderTaskService,
    scoringService,
  );
  return {
    policyService,
    workspaceService: new WorkspaceService(sql, coordination, providerService),
    projectService: new ProjectService(sql, coordination, policyService, {
      initialDraftService,
      planSectionAggregator: planSectionAggregatorService,
    }),
    documentService: new DocumentService(
      sql,
      coordination,
      policyService,
      extras.objectStore,
      extras.jobQueue,
      scoringService,
    ),
    interviewService: new InterviewService(sql, coordination, policyService, scoringService),
    providerService,
    mcpServerService: new McpServerService(
      sql,
      coordination,
      extras.secretBox,
      extras.allowMcpLoopback === true,
      extras.mcpFactory,
    ),
    sprintService,
    moneyRulesService: new MoneyRulesService(sql, coordination, policyService, scoringService),
    experimentService: new ExperimentService(sql, coordination, policyService, scoringService),
    artifactService: new ArtifactService(
      sql,
      coordination,
      policyService,
      extras.objectStore,
      extras.jobQueue,
    ),
    packService: new PackService(sql, coordination, policyService, scoringService),
    approvalService: new ApprovalService(sql, coordination, policyService, extras.jobQueue),
    decisionService: new DecisionService(sql, coordination, policyService),
    metricService: new MetricService(sql, coordination, policyService, scoringService),
    integrationService: new IntegrationService(sql, coordination, policyService, extras.secretBox),
    memberService: new MemberService(sql, coordination, policyService),
    scoringService,
    founderTaskService,
    conversationService,
    jobService: new JobService(sql, coordination, policyService, sprintService),
    planSectionAggregatorService,
    initialDraftService,
    researchFindingService: new ResearchFindingService(sql),
  };
}

let streamBusSingleton: StreamBus | undefined;

function extrasFromEnv(): ServiceExtras {
  const env = getEnv();
  const secretKey = env.FOUNDRY_SECRETS_KEY ?? env.BETTER_AUTH_SECRET;
  streamBusSingleton ??=
    env.REDIS_URL === undefined ? createMemoryStreamBus() : createRedisStreamBus(env.REDIS_URL);
  return {
    objectStore:
      env.AWS_S3_UPLOADS_BUCKET === undefined
        ? createMemoryObjectStore()
        : createS3ObjectStore(env),
    jobQueue:
      env.REDIS_URL === undefined ? createMemoryJobQueue() : createBullmqJobQueue(env.REDIS_URL),
    streamBus: streamBusSingleton,
    secretBox: createSecretBox(secretKey),
    secrets: {
      ...(env.ANTHROPIC_API_KEY === undefined ? {} : { anthropicApiKey: env.ANTHROPIC_API_KEY }),
      ...(env.OPENAI_API_KEY === undefined ? {} : { openaiApiKey: env.OPENAI_API_KEY }),
      ...(env.AI_GATEWAY_API_KEY === undefined ? {} : { gatewayApiKey: env.AI_GATEWAY_API_KEY }),
    },
    allowMcpLoopback: env.ALLOW_MCP_LOOPBACK === 'true' || env.NODE_ENV === 'test',
  };
}

export async function createContext(req: Request): Promise<Context> {
  const headers = headersWithAccessKey(req);
  const correlationId = headers.get('x-correlation-id') ?? randomUUID();
  const session = await getAuth().api.getSession({ headers });
  const sql = getSql();
  const coordination = getCoordinationStore();
  const policyService = new PolicyService();
  const extras = extrasFromEnv();
  const clientIp =
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? headers.get('x-real-ip') ?? 'unknown';

  if (session === null) {
    return {
      sql,
      actor: { type: 'anonymous' },
      session: null,
      correlationId,
      coordination,
      services: createServices(sql, coordination, policyService, extras),
      clientIp,
      objectStore: extras.objectStore,
      jobQueue: extras.jobQueue,
      streamBus: extras.streamBus,
    };
  }

  const userId = UserIdSchema.parse(session.user.id);
  const memberships = await listWorkspaceMembershipsByUserId(sql, userId);

  return {
    sql,
    actor: { type: 'user', userId, memberships },
    session: {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: 'role' in session.user ? String(session.user.role) : null,
      },
    },
    correlationId,
    coordination,
    services: createServices(sql, coordination, policyService, extras),
    clientIp,
    objectStore: extras.objectStore,
    jobQueue: extras.jobQueue,
    streamBus: extras.streamBus,
  };
}
