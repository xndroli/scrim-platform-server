"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const index_1 = require("../config/index");
const neon_http_1 = require("drizzle-orm/neon-http");
const serverless_1 = require("@neondatabase/serverless");
const sql = (0, serverless_1.neon)(index_1.config.database.url);
exports.db = (0, neon_http_1.drizzle)({ client: sql });
