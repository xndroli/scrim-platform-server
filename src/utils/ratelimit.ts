import { getRedisClient } from "./redis";
import { Ratelimit } from "@upstash/ratelimit";
import { isRedisConfigured } from "../config/environment";

let ratelimiter: Ratelimit | null = null;

// Initialize rate limiter if Redis is configured
if (isRedisConfigured()) {
  const redis = getRedisClient();
  if (redis) {
    ratelimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(5, "1 m"),
      analytics: true,
      prefix: "@upstash/ratelimit",
    });
  }
}

// Create a safe rate limiter function that works even when Redis isn't available
export const rateLimit = async (identifier: string) => {
  if (!ratelimiter) {
    // If no rate limiter is available, always allow the request
    return { success: true, limit: 0, remaining: 999, reset: 0 };
  }
  
  try {
    return await ratelimiter.limit(identifier);
  } catch (error) {
    console.error('Rate limiting error:', error);
    // On error, default to allowing the request
    return { success: true, limit: 0, remaining: 999, reset: 0 };
  }
};

export default ratelimiter;