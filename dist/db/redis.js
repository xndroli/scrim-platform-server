"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../config/index");
const redis_1 = require("@upstash/redis");
const redis = new redis_1.Redis({
    url: index_1.config.redis.url,
    token: index_1.config.redis.token,
});
exports.default = redis;
