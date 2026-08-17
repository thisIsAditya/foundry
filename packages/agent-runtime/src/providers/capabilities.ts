export type ProviderCapabilities = {
  streaming: boolean;
  toolCalling: boolean;
  structuredOutput: boolean;
  vision: boolean;
  embeddings: boolean;
  longContext: boolean;
  codeGeneration: boolean;
  nativeSearch: boolean;
  dataResidency: 'in_region' | 'unspecified';
};

export type ProviderSecrets = {
  anthropicApiKey?: string;
  openaiApiKey?: string;
  gatewayApiKey?: string;
};

export const anthropicCapabilities: ProviderCapabilities = {
  streaming: true,
  toolCalling: true,
  structuredOutput: true,
  vision: true,
  embeddings: false,
  longContext: true,
  codeGeneration: true,
  nativeSearch: false,
  dataResidency: 'unspecified',
};

export const openaiCapabilities: ProviderCapabilities = {
  streaming: true,
  toolCalling: true,
  structuredOutput: true,
  vision: true,
  embeddings: true,
  longContext: true,
  codeGeneration: true,
  nativeSearch: true,
  dataResidency: 'unspecified',
};

export const bedrockCapabilities: ProviderCapabilities = {
  streaming: true,
  toolCalling: true,
  structuredOutput: true,
  vision: true,
  embeddings: true,
  longContext: true,
  codeGeneration: true,
  nativeSearch: false,
  dataResidency: 'in_region',
};

export const gatewayCapabilities: ProviderCapabilities = {
  streaming: true,
  toolCalling: true,
  structuredOutput: true,
  vision: true,
  embeddings: true,
  longContext: true,
  codeGeneration: true,
  nativeSearch: true,
  dataResidency: 'unspecified',
};

export const localCapabilities: ProviderCapabilities = {
  streaming: true,
  toolCalling: false,
  structuredOutput: false,
  vision: false,
  embeddings: false,
  longContext: false,
  codeGeneration: true,
  nativeSearch: false,
  dataResidency: 'in_region',
};
