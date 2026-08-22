import {
  createMemoryStreamBus,
  createRedisStreamBus,
  createCofounderRuntime,
  type CofounderRuntime,
  type StreamBus,
} from '@foundry/agent-runtime';
import { listWorkspaceMembershipsByUserId, type PoolSql } from '@foundry/db';
import { UserIdSchema, type UserId, type WorkspaceMembership } from '@foundry/domain';
import { PolicyService } from '@foundry/policy';
import { randomUUID } from 'node:crypto';

import { headersWithAccessKey } from '../lib/access-key';
import { getAuth } from '../lib/auth';
import { getEnv } from '../lib/env';
import { getSql } from '../lib/sql';
import { getCoordinationStore, type CoordinationStore } from './coordination';
import { createBullmqJobQueue, createMemoryJobQueue, type JobQueue } from './queue/job-queue';
import { BusinessRecordService } from './services/business-record-service';
import { CapabilityGateway } from '@foundry/cofounder-operations';
import { CofounderService } from './services/cofounder-service';
import { ContextService } from './services/context-service';
import { ConversationService } from './services/conversation-service';
import { DecisionService } from './services/decision-service';
import { DocumentService } from './services/document-service';
import { ExperimentService } from './services/experiment-service';
import { InterviewImportService } from './services/interview-import-service';
import { InterviewService } from './services/interview-service';
import { JourneyService } from './services/journey-service';
import { MemberService } from './services/member-service';
import { MemoryService } from './services/memory-service';
import { ProjectService } from './services/project-service';
import { ProposalService } from './services/proposal-service';
import { WorkspaceService } from './services/workspace-service';
import { createMemoryObjectStore, type ObjectStore } from './storage/object-store';
import { createS3ObjectStore } from './storage/s3-object-store';

export type AuthSession = {
  user: { id: string; name: string; email: string; role: string | null };
} | null;

export type Actor =
  { type: 'anonymous' } | { type: 'user'; userId: UserId; memberships: WorkspaceMembership[] };

export type ServiceContainer = {
  policyService: PolicyService;
  workspaceService: WorkspaceService;
  projectService: ProjectService;
  documentService: DocumentService;
  interviewService: InterviewService;
  interviewImportService: InterviewImportService;
  memoryService: MemoryService;
  experimentService: ExperimentService;
  decisionService: DecisionService;
  memberService: MemberService;
  conversationService: ConversationService;
  journeyService: JourneyService;
  businessRecordService: BusinessRecordService;
  proposalService: ProposalService;
  contextService: ContextService;
  cofounderService: CofounderService;
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
  cofounderRuntime: CofounderRuntime;
  cofounderWorkerEnabled?: boolean;
  capabilityInvokeUrl?: string;
};

export function createServices(
  sql: PoolSql,
  coordination: CoordinationStore,
  policyService: PolicyService,
  extras: ServiceExtras,
): ServiceContainer {
  const journeyService = new JourneyService(sql, policyService);
  const businessRecordService = new BusinessRecordService(sql, policyService);
  const proposalService = new ProposalService(sql, policyService, businessRecordService);
  const contextService = new ContextService(sql, policyService);
  const interviewService = new InterviewService(sql, coordination, policyService);
  const interviewImportService = new InterviewImportService(sql, policyService);
  const memoryService = new MemoryService(sql, policyService);
  const cofounderService = new CofounderService(
    sql,
    policyService,
    contextService,
    new CapabilityGateway(sql, policyService),
    extras.streamBus,
    extras.cofounderRuntime,
    coordination,
    extras.jobQueue,
    extras.cofounderWorkerEnabled !== false,
    extras.capabilityInvokeUrl,
  );
  return {
    policyService,
    workspaceService: new WorkspaceService(sql, coordination),
    projectService: new ProjectService(sql, coordination, policyService, {
      journeyService,
    }),
    documentService: new DocumentService(
      sql,
      coordination,
      policyService,
      extras.objectStore,
      extras.jobQueue,
    ),
    interviewService,
    interviewImportService,
    memoryService,
    experimentService: new ExperimentService(sql, coordination, policyService),
    decisionService: new DecisionService(sql, coordination, policyService),
    memberService: new MemberService(sql, coordination, policyService),
    conversationService: new ConversationService(sql, policyService),
    journeyService,
    businessRecordService,
    proposalService,
    contextService,
    cofounderService,
  };
}

let streamBusSingleton: StreamBus | undefined;

function extrasFromEnv(): ServiceExtras {
  const env = getEnv();
  streamBusSingleton ??=
    env.REDIS_URL === undefined ? createMemoryStreamBus() : createRedisStreamBus(env.REDIS_URL);
  const selected = createCofounderRuntime({
    ...(env.FOUNDRY_AI === undefined ? {} : { aiMode: env.FOUNDRY_AI }),
    ...(env.FOUNDRY_HARNESS_URL === undefined ? {} : { harnessEndpoint: env.FOUNDRY_HARNESS_URL }),
    ...(env.FOUNDRY_HARNESS_TOKEN === undefined ? {} : { harnessToken: env.FOUNDRY_HARNESS_TOKEN }),
  });
  return {
    objectStore:
      env.AWS_S3_UPLOADS_BUCKET === undefined
        ? createMemoryObjectStore()
        : createS3ObjectStore(env),
    jobQueue:
      env.REDIS_URL === undefined ? createMemoryJobQueue() : createBullmqJobQueue(env.REDIS_URL),
    streamBus: streamBusSingleton,
    cofounderRuntime: selected.runtime,
    cofounderWorkerEnabled: env.FOUNDRY_COFOUNDER_WORKER !== 'false',
    capabilityInvokeUrl:
      env.FOUNDRY_CAPABILITY_INVOKE_URL ??
      `${env.BETTER_AUTH_URL}/api/internal/capabilities/invoke`,
  };
}

export async function createContext(request: Request): Promise<Context> {
  const headers = headersWithAccessKey(request);
  const correlationId = headers.get('x-correlation-id') ?? randomUUID();
  const session = await getAuth().api.getSession({ headers });
  const sql = getSql();
  const coordination = getCoordinationStore();
  const policyService = new PolicyService();
  const extras = extrasFromEnv();
  const clientIp =
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? headers.get('x-real-ip') ?? 'unknown';
  const services = createServices(sql, coordination, policyService, extras);

  if (session === null) {
    return {
      sql,
      actor: { type: 'anonymous' },
      session: null,
      correlationId,
      coordination,
      services,
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
    services,
    clientIp,
    objectStore: extras.objectStore,
    jobQueue: extras.jobQueue,
    streamBus: extras.streamBus,
  };
}
