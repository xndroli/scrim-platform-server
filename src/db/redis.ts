import { config } from "../config/index";
import { Redis } from "@upstash/redis";

const redis = new Redis({
    url: config.redis.url,
    token: config.redis.token,
});

export default redis;