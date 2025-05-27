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

  // Better Auth Configuration
  BETTER_AUTH_SECRET: z.string().min(1, 'Better Auth secret is required'),
  BETTER_AUTH_URL: z.string().url().optional(),

  // CORS Configuration
  CORS_ORIGIN: z.string().default('*'),
  CORS_ORIGIN_1: z.string().default('*'),

  // Discord Bot Configuration
  DISCORD_BOT_TOKEN: z.string().min(1, 'Discord bot token is required'),
  DISCORD_GUILD_ID: z.string().min(1, 'Discord guild ID is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'Discord client ID is required'),
  DISCORD_CLIENT_SECRET: z.string().min(1, 'Discord client secret is required'),
  DISCORD_REDIRECT_URI: z.string().url().optional(),

  // Apex Legends API Configuration
  APEX_API_KEY: z.string().min(1, 'Apex Legends API key is required'),
  APEX_API_BASE_URL: z.string().url().default('https://api.mozambiquehe.re'),
  APEX_CURRENT_SEASON: z.string().transform(val => parseInt(val, 10)).default('20'),

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
export const config = env.data as { 
  effectiveRefreshSecret: string;
  DISCORD_WEBHOOK_URL?: string;
} & typeof env.data;

// Compute the effective refresh token secret
config.effectiveRefreshSecret = config.BETTER_AUTH_SECRET || config.BETTER_AUTH_SECRET;

// Helper functions
export const isRedisConfigured = (): boolean => {
  return !!config.UPSTASH_REDIS_URL && !!config.UPSTASH_REDIS_TOKEN;
};

export const isQStashConfigured = (): boolean => {
  return !!config.QSTASH_TOKEN;
};

export const isResendConfigured = (): boolean => {
  return !!config.RESEND_TOKEN && !!config.EMAIL_FROM_ADDRESS;
};

export const isDiscordConfigured = (): boolean => {
  return !!(
    config.DISCORD_BOT_TOKEN && 
    config.DISCORD_GUILD_ID && 
    config.DISCORD_CLIENT_ID && 
    config.DISCORD_CLIENT_SECRET
  );
};

export const isApexConfigured = (): boolean => {
  return !!config.APEX_API_KEY;
};

// Validation functions
export const validateDiscordConfig = (): void => {
  if (!isDiscordConfigured()) {
    throw new Error('Discord configuration is incomplete. Please check your environment variables.');
  }
};

export const validateApexConfig = (): void => {
  if (!isApexConfigured()) {
    throw new Error('Apex Legends API configuration is incomplete. Please check your environment variables.');
  }
};