import { apiKey } from '@better-auth/api-key';
import { expo } from '@better-auth/expo';
import { limits } from '@foundry/config/limits';
import { sslConfigFromDatabaseUrl } from '@foundry/db';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import pg from 'pg';

import { getEnv } from './env';

const apiKeyPluginOptions = {
  enableSessionForAPIKeys: true,
  apiKeyHeaders: 'x-api-key',
  rateLimit: {
    enabled: true,
    timeWindow: 60_000,
    maxRequests: limits.rateLimit.adminApiKeyPerMinute,
  },
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
} as const;

function createAuth() {
  const env = getEnv();
  const googleId = env.GOOGLE_CLIENT_ID;
  const googleSecret = env.GOOGLE_CLIENT_SECRET;
  const ssl = sslConfigFromDatabaseUrl(env.DATABASE_URL);
  const database = new pg.Pool({
    connectionString: env.DATABASE_URL,
    ...(ssl === undefined ? {} : { ssl }),
  });

  const shared = {
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database,
    trustedOrigins: ['foundry://', env.BETTER_AUTH_URL],
    user: {
      modelName: 'users' as const,
      fields: {
        emailVerified: 'email_verified',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
      additionalFields: {
        role: { type: 'string' as const, defaultValue: 'founder', required: true },
        timezone: { type: 'string' as const, defaultValue: 'UTC', required: true },
        locale: { type: 'string' as const, defaultValue: 'en-IN', required: true },
      },
    },
    session: {
      modelName: 'sessions' as const,
      fields: {
        userId: 'user_id',
        expiresAt: 'expires_at',
        ipAddress: 'ip_address',
        userAgent: 'user_agent',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
      cookieCache: {
        enabled: true,
        maxAge: limits.betterAuthSessionCookieCacheTtlSeconds,
      },
    },
    account: {
      modelName: 'accounts' as const,
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
      modelName: 'verifications' as const,
      fields: {
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    advanced: {
      database: {
        generateId: 'uuid' as const,
      },
    },
  };

  if (googleId !== undefined && googleSecret !== undefined) {
    return betterAuth({
      ...shared,
      socialProviders: {
        google: {
          clientId: googleId,
          clientSecret: googleSecret,
        },
      },
      plugins: [nextCookies(), expo(), apiKey(apiKeyPluginOptions)],
    });
  }

  return betterAuth({
    ...shared,
    plugins: [nextCookies(), expo(), apiKey(apiKeyPluginOptions)],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as typeof globalThis & { foundryAuth?: Auth };

export function getAuth(): Auth {
  globalForAuth.foundryAuth ??= createAuth();
  return globalForAuth.foundryAuth;
}
