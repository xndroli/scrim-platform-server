"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = void 0;
const migrator_1 = require("drizzle-orm/neon-http/migrator");
const index_1 = require("./index");
const logger_1 = require("../utils/logger");
const runMigrations = async () => {
    try {
        logger_1.logger.info('Running migrations...');
        await (0, migrator_1.migrate)(index_1.db, { migrationsFolder: './migrations' });
        logger_1.logger.info('Migrations completed successfully');
    }
    catch (error) {
        logger_1.logger.error('Migration failed:', error);
        process.exit(1);
    }
};
exports.runMigrations = runMigrations;
// Run migrations if this file is executed directly
if (require.main === module) {
    runMigrations();
}
