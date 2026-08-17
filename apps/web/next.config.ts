import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(dir, '../..'),
  transpilePackages: [
    '@foundry/api-contracts',
    '@foundry/config',
    '@foundry/db',
    '@foundry/domain',
    '@foundry/observability',
    '@foundry/policy',
  ],
  serverExternalPackages: [
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
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
};

export default nextConfig;
