import { config } from '../config/index';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const sql = neon(config.database.url);

export const db = drizzle({ client: sql });
