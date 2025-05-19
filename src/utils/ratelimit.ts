import redis from "../db/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Create a new ratelimiter, that allows 5 requests per 1 minute
const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.fixedWindow(5, "1 m"),
    analytics: true,
    prefix: "@upstash/ratelimit",
});

export default ratelimit;