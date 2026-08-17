import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(dir, '../..'),
  transpilePackages: [
    '@foundry/api-contracts',
    '@foundry/agent-runtime',
    '@foundry/config',
    '@foundry/domain',
    '@foundry/observability',
    '@foundry/policy',
    '@foundry/ui',
  ],
  serverExternalPackages: [
    // postgres.js Query extends Promise; bundling it throws on V8's Promise #state.
    '@foundry/db',
    'postgres',
    'pg',
    'ioredis',
    'bullmq',
    '@aws-sdk/client-s3',
    '@aws-sdk/s3-request-presigner',
    'pino',
    '@opentelemetry/sdk-node',
    '@opentelemetry/auto-instrumentations-node',
    '@opentelemetry/exporter-trace-otlp-http',
    'ai',
    '@ai-sdk/anthropic',
    '@ai-sdk/openai',
    '@ai-sdk/amazon-bedrock',
    '@ai-sdk/gateway',
    '@ai-sdk/openai-compatible',
    '@ai-sdk/mcp',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
};

export default nextConfig;
