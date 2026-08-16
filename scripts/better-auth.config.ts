import { betterAuth } from 'better-auth';
import { apiKey } from '@better-auth/api-key';
import pg from 'pg';

export const auth = betterAuth({
  baseURL: 'http://localhost:3000',
  database: new pg.Pool({
    connectionString: 'postgres://foundry:foundry@localhost:5432/foundry',
  }),
  secret: 'schema-generation-only-not-used-at-runtime-32',
  user: {
    modelName: 'users',
    fields: {
      emailVerified: 'email_verified',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    additionalFields: {
      role: { type: 'string', defaultValue: 'founder', required: true },
      timezone: { type: 'string', defaultValue: 'UTC', required: true },
      locale: { type: 'string', defaultValue: 'en-IN', required: true },
    },
  },
  session: {
    modelName: 'sessions',
    fields: {
      userId: 'user_id',
      expiresAt: 'expires_at',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  account: {
    modelName: 'accounts',
    fields: {
      userId: 'user_id',
      providerId: 'provider_id',
      accountId: 'account_id',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      idToken: 'id_token',
      accessTokenExpiresAt: 'access_token_expires_at',
      refreshTokenExpiresAt: 'refresh_token_expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  verification: {
    modelName: 'verifications',
    fields: {
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  plugins: [
    apiKey({
      enableSessionForAPIKeys: true,
      apiKeyHeaders: 'x-api-key',
      rateLimit: { enabled: true, timeWindow: 60_000, maxRequests: 30 },
      schema: {
        apikey: {
          modelName: 'api_keys',
          fields: {
            configId: 'config_id',
            referenceId: 'user_id',
            key: 'key_hash',
            refillInterval: 'refill_interval',
            refillAmount: 'refill_amount',
            lastRefillAt: 'last_refill_at',
            rateLimitEnabled: 'rate_limit_enabled',
            rateLimitTimeWindow: 'rate_limit_time_window',
            rateLimitMax: 'rate_limit_max',
            requestCount: 'request_count',
            lastRequest: 'last_request_at',
            expiresAt: 'expires_at',
            createdAt: 'created_at',
            updatedAt: 'updated_at',
          },
        },
      },
    }),
  ],
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
});
