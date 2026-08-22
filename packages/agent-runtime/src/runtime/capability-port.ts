export type RuntimeCapabilityRequest = {
  name: string;
  input: unknown;
  operationId: string;
};

export type RuntimeCapabilityResult = {
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
};

export type RuntimeCapabilityPort = {
  invoke(request: RuntimeCapabilityRequest): Promise<RuntimeCapabilityResult>;
};
