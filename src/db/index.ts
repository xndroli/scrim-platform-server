import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { config } from '../config/environment';
import * as schema from './schema';

// Initialize Neon HTTP client
const sql = neon(config.DATABASE_URL!);

// Create Drizzle ORM instance
export const db = drizzle(sql, { schema });

// Check database connection
export const checkDbConnection = async () => {
  try {
    const result = await sql`SELECT NOW()`;
    console.log('✅ Database connection successful:', result[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};