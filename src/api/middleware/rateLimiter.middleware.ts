import { Request, Response, NextFunction } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { config } from '../../config/environment';

let rateLimiter: Ratelimit | null = null;

// Initialize rate limiter if Redis is configured
if (config.UPSTASH_REDIS_URL && config.UPSTASH_REDIS_TOKEN) {
  const redis = new Redis({
    url: config.UPSTASH_REDIS_URL,
    token: config.UPSTASH_REDIS_TOKEN,
  });
  
  // Create rate limiter instance
  rateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.RATE_LIMIT_MAX, `${config.RATE_LIMIT_WINDOW_MS}ms`),
  });
}

export const rateLimiterMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip rate limiting if not configured
    if (!rateLimiter) {
      return next();
    }
    
    // Get client identifier (IP or user ID)
    const identifier = req.user?.userId.toString() || req.ip;
    if (identifier === undefined) {
      throw new Error('Identifier is undefined');
    }
    
    // Apply rate limiting
    const { success, remaining, reset } = await rateLimiter.limit(identifier as string);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.RATE_LIMIT_MAX.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', reset.toString());
    
    if (!success) {
      return res.status(429).json({
        status: 'error',
        message: 'Too many requests, please try again later',
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};