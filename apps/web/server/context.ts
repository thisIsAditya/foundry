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

import { getAuth } from '../lib/auth';
import { getEnv } from '../lib/env';
import { getSql } from '../lib/sql';
import { getCoordinationStore, type CoordinationStore } from './coordination';
import { createBullmqJobQueue, createMemoryJobQueue, type JobQueue } from './queue/job-queue';
import { DocumentService } from './services/document-service';
import { McpServerService } from './services/mcp-server-service';
import { ProjectService } from './services/project-service';
import { ProviderService, type CapabilityProbe } from './services/provider-service';
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
  providerService: ProviderService;
  mcpServerService: McpServerService;
  sprintService: SprintService;
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
  return {
    policyService,
    workspaceService: new WorkspaceService(sql, coordination),
    projectService: new ProjectService(sql, coordination, policyService, {
      streamBus: extras.streamBus,
      secretBox: extras.secretBox,
      secrets: extras.secrets,
      ...(extras.languageModel === undefined ? {} : { languageModel: extras.languageModel }),
    }),
    documentService: new DocumentService(
      sql,
      coordination,
      policyService,
      extras.objectStore,
      extras.jobQueue,
    ),
    providerService: new ProviderService(
      sql,
      coordination,
      policyService,
      extras.secretBox,
      extras.secrets,
      extras.capabilityProbe ?? probeProviderCapabilities,
    ),
    mcpServerService: new McpServerService(
      sql,
      coordination,
      extras.secretBox,
      extras.allowMcpLoopback === true,
      extras.mcpFactory,
    ),
    sprintService: new SprintService(
      sql,
      coordination,
      policyService,
      extras.jobQueue,
      extras.streamBus,
    ),
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
  const correlationId = req.headers.get('x-correlation-id') ?? randomUUID();
  const session = await getAuth().api.getSession({ headers: req.headers });
  const sql = getSql();
  const coordination = getCoordinationStore();
  const policyService = new PolicyService();
  const extras = extrasFromEnv();
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

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
