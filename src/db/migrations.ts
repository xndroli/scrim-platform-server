import { migrate } from 'drizzle-orm/neon-http/migrator';
import { db } from './index';
import { logger } from '../utils/logger';

const runMigrations = async () => {
  try {
    logger.info('Running migrations...');
    await migrate(db, { migrationsFolder: './migrations' });
    logger.info('Migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };
