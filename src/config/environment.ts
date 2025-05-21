import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define schema for environment variables
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(val => parseInt(val, 10)).default('3000'),

  // Database Configuration
  DATABASE_URL: z.string().min(1),

  // JWT Configuration
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // JWT Refresh Token Configuration (new)
  JWT_REFRESH_SECRET: z.string().optional().default(''),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  JWT_THROW_ERROR: z.string().optional().default('true'),

  // CORS Configuration
  CORS_ORIGIN: z.string().default('*'),
  CORS_ORIGIN_1: z.string().default('*'),

  // Upstash Redis Configuration
  UPSTASH_REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_TOKEN: z.string().optional(),

  // QStash Configuration
  QSTASH_URL: z.string().url().default('https://qstash.upstash.io/v2/publish'),
  QSTASH_TOKEN: z.string().optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),

  // Resend Email Configuration
  RESEND_TOKEN: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),

  // Rate Limiting Configuration
  RATE_LIMIT_MAX: z.string().transform(val => parseInt(val, 10)).default('100'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).default('60000'),
});

// Parse environment variables
const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error('❌ Invalid environment variables:', env.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

// Extract the validated environment variables
export const config = env.data as { effectiveRefreshSecret: string } & typeof env.data;

// Compute the effective refresh token secret (use JWT_SECRET if refresh secret is not specified)
config.effectiveRefreshSecret = config.JWT_REFRESH_SECRET || config.JWT_SECRET;

// Helper function to check if Upstash Redis is configured
export const isRedisConfigured = (): boolean => {
  return !!config.UPSTASH_REDIS_URL && !!config.UPSTASH_REDIS_TOKEN;
};

// Helper function to check if QStash is configured
export const isQStashConfigured = (): boolean => {
  return !!config.QSTASH_TOKEN;
}

// Helper function to check if Resend is configured
export const isResendConfigured = (): boolean => {
  return !!config.RESEND_TOKEN && !!config.EMAIL_FROM_ADDRESS;
};