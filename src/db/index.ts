import { drizzle } from 'drizzle-orm/neon-http';
import { neon, Pool } from '@neondatabase/serverless';
import { config } from '../config';
import { logger } from '../utils/logger';

// Initialize Neon client
const sql = neon(config.database.url);

// Initialize Drizzle
export const db = drizzle({ client: sql });

// Test database connection
export const testConnection = async () => {
  try {
    const result = await sql`SELECT NOW()`;
    logger.info('Database connection successful');
    return result;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};
