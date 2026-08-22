import type {
  CofounderContextPacket,
  CofounderRuntime,
  RuntimeCapabilityPort,
} from '@foundry/agent-runtime';
import type { StreamEvent } from '@foundry/api-contracts';
import type {
  CofounderOperation,
  CofounderOperationId,
  CofounderOperationState,
  ConversationBlock,
  ConversationMessage,
  ConversationReference,
} from '@foundry/domain';

export type OperationStatePatch = {
  state: CofounderOperationState;
  usage?: unknown;
  recovery?: unknown;
  canceledAt?: Date | null;
};

export type OperationStorePort = {
  getById(id: CofounderOperationId): Promise<CofounderOperation | null>;
  claimQueued(id: CofounderOperationId): Promise<CofounderOperation | null>;
  updateState(id: CofounderOperationId, patch: OperationStatePatch): Promise<CofounderOperation>;
};

export type InsertOperationMessage = {
  actor: ConversationMessage['actor'];
  text: string;
  blocks: ConversationBlock[];
  references?: ConversationReference[];
};

export type MessageStorePort = {
  insert(input: InsertOperationMessage): Promise<ConversationMessage>;
  getById(id: ConversationMessage['id']): Promise<ConversationMessage | null>;
};

export type CancelPort = {
  subscribe(operationId: CofounderOperationId, onCancel: () => void): () => void;
  isSignaled(operationId: CofounderOperationId): Promise<boolean>;
};

export type CofounderOperationPorts = {
  operations: OperationStorePort;
  messages: MessageStorePort;
  context: {
    buildPacket(correlationId: string): Promise<CofounderContextPacket>;
  };
  runtime: CofounderRuntime;
  capabilities: RuntimeCapabilityPort;
  events: {
    publish(event: StreamEvent): Promise<void>;
  };
  cancel: CancelPort;
};

export type ExecuteCofounderOperationInput = {
  operationId: CofounderOperationId;
  founderRequest: string;
  stepId?: string;
  correlationId: string;
  executor: 'inline' | 'worker';
  timeoutMs: number;
};
