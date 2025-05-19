"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const environment_1 = require("./environment");
exports.config = {
    server: {
        port: parseInt(environment_1.environment.PORT, 10),
        nodeEnv: environment_1.environment.NODE_ENV,
    },
    database: {
        url: environment_1.environment.DATABASE_URL,
    },
    auth: {
        jwtSecret: environment_1.environment.JWT_SECRET,
        jwtExpiresIn: environment_1.environment.JWT_EXPIRES_IN,
    },
    redis: {
        url: environment_1.environment.UPSTASH_REDIS_URL,
        token: environment_1.environment.UPSTASH_REDIS_TOKEN,
    },
    qstash: {
        url: environment_1.environment.QSTASH_URL,
        token: environment_1.environment.QSTASH_TOKEN,
    },
    email: {
        resendToken: environment_1.environment.RESEND_TOKEN,
    },
    cors: {
        origin: environment_1.environment.CORS_ORIGIN,
    },
};
