import { config } from "../config/environment";
import { Redis } from "@upstash/redis";

const redis = new Redis({
    url: config.UPSTASH_REDIS_URL,
    token: config.UPSTASH_REDIS_TOKEN,
});

export default redis;