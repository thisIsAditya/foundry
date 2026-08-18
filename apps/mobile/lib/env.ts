import { z } from 'zod';

const EnvSchema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z.url().default('http://localhost:3210'),
});

export type MobileEnv = z.infer<typeof EnvSchema>;

let cached: MobileEnv | undefined;

export function getMobileEnv(): MobileEnv {
  cached ??= EnvSchema.parse({
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  });
  return cached;
}

export function apiBaseUrl(): string {
  return getMobileEnv().EXPO_PUBLIC_API_BASE_URL.replace(/\/$/u, '');
}
