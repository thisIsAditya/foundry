import { z } from 'zod';

export const RenderJobStatuses = ['queued', 'running', 'succeeded', 'failed'] as const;
export const RenderJobStatusSchema = z.enum(RenderJobStatuses);
export type RenderJobStatus = z.infer<typeof RenderJobStatusSchema>;

export const ProviderFamilies = [
  'ai_gateway',
  'anthropic',
  'openai',
  'bedrock',
  'openai_compatible',
  'ollama',
] as const;
export const ProviderFamilySchema = z.enum(ProviderFamilies);
export type ProviderFamily = z.infer<typeof ProviderFamilySchema>;

export const ProviderHealthStatuses = ['unknown', 'ok', 'error'] as const;
export const ProviderHealthStatusSchema = z.enum(ProviderHealthStatuses);
export type ProviderHealthStatus = z.infer<typeof ProviderHealthStatusSchema>;

export const IntegrationProviders = [
  'calendar',
  'email',
  'whatsapp',
  'storage',
  'payment',
  'crm',
  'accounting',
] as const;
export const IntegrationProviderSchema = z.enum(IntegrationProviders);
export type IntegrationProvider = z.infer<typeof IntegrationProviderSchema>;

export const McpTransports = ['http', 'sse'] as const;
export const McpTransportSchema = z.enum(McpTransports);
export type McpTransport = z.infer<typeof McpTransportSchema>;

export const McpHealthStatuses = ['unknown', 'ok', 'unreachable', 'auth_failed'] as const;
export const McpHealthStatusSchema = z.enum(McpHealthStatuses);
export type McpHealthStatus = z.infer<typeof McpHealthStatusSchema>;
