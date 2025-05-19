import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';
import { config } from '../config/environment';
import * as schema from './schema';

// Run migrations
export const runMigrations = async () => {
  try {
    console.log('Running migrations...');
    
    // Create separate connection for migrations
    const migrationClient = neon(config.DATABASE_URL);
    const db = drizzle(migrationClient, { schema });
    
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migrations if file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Migration script failed:', err);
      process.exit(1);
    });
}