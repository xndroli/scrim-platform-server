// src/utils/redis.ts
import { Redis } from '@upstash/redis';
import { config, isRedisConfigured } from '../config/environment';

let redisClient: Redis | null = null;

// Initialize Redis client
export const getRedisClient = (): Redis | null => {
  if (!isRedisConfigured()) {
    console.warn('Redis not configured. Some features may not work properly.');
    return null;
  }
  
  if (!redisClient) {
    redisClient = new Redis({
      url: config.UPSTASH_REDIS_URL!,
      token: config.UPSTASH_REDIS_TOKEN!,
    });
  }
  
  return redisClient;
};

// Check Redis connection
export const checkRedisConnection = async (): Promise<boolean> => {
  const redis = getRedisClient();
  
  if (!redis) {
    return false;
  }
  
  try {
    const pong = await redis.ping();
    console.log('✅ Redis connection successful:', pong);
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    return false;
  }
};