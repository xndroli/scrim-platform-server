"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = __importDefault(require("../db/redis"));
const ratelimit_1 = require("@upstash/ratelimit");
// Create a new ratelimiter, that allows 5 requests per 1 minute
const ratelimit = new ratelimit_1.Ratelimit({
    redis: redis_1.default,
    limiter: ratelimit_1.Ratelimit.fixedWindow(5, "1 m"),
    analytics: true,
    prefix: "@upstash/ratelimit",
});
exports.default = ratelimit;
