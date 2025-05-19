"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnection = exports.db = void 0;
const neon_http_1 = require("drizzle-orm/neon-http");
const serverless_1 = require("@neondatabase/serverless");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
// Initialize Neon client
const sql = (0, serverless_1.neon)(config_1.config.database.url);
// Initialize Drizzle
exports.db = (0, neon_http_1.drizzle)({ client: sql });
// Test database connection
const testConnection = async () => {
    try {
        const result = await sql `SELECT NOW()`;
        logger_1.logger.info('Database connection successful');
        return result;
    }
    catch (error) {
        logger_1.logger.error('Database connection failed:', error);
        throw error;
    }
};
exports.testConnection = testConnection;
