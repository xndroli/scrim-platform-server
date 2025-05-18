import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

// Define schema for environment variables
const envSchema = z.object({
  // Server
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DATABASE_URL: z.string(),
  
  // Auth
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // Redis
  UPSTASH_REDIS_URL: z.string(),
  UPSTASH_REDIS_TOKEN: z.string(),
  
  // QStash
  QSTASH_URL: z.string(),
  QSTASH_TOKEN: z.string(),
  
  // Email
  RESEND_TOKEN: z.string(),
  
  // CORS
  CORS_ORIGIN: z.string(),
});

// Parse and validate environment variables
const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error('❌ Invalid environment variables:', env.error.format());
  throw new Error('Invalid environment variables');
}

export const environment = env.data;
