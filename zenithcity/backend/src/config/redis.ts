import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

let redis: Redis | null = null;
let redisAvailable = false;

// In-memory fallback for when Redis is unavailable
const memoryCache = new Map<string, { value: string; expires?: number }>();

export function getRedis(): Redis | null {
  return redis;
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export async function initRedis(): Promise<void> {
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Do not retry on failures
    });

    // Suppress unhandled error events
    redis.on('error', (err) => {
      // Ignore errors when using the memory fallback
    });

    await redis.connect();
    redisAvailable = true;
    console.log('✅ Redis connected');
  } catch (err) {
    console.warn('⚠️  Redis unavailable, using in-memory fallback');
    redisAvailable = false;
  }
}

// Cache abstraction layer that falls back to memory
export const cache = {
  async get(key: string): Promise<string | null> {
    if (redis && redisAvailable) {
      return redis.get(key);
    }
    const item = memoryCache.get(key);
    if (!item) return null;
    if (item.expires && Date.now() > item.expires) {
      memoryCache.delete(key);
      return null;
    }
    return item.value;
  },

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (redis && redisAvailable) {
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, value);
      } else {
        await redis.set(key, value);
      }
      return;
    }
    memoryCache.set(key, {
      value,
      expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  },

  async del(key: string): Promise<void> {
    if (redis && redisAvailable) {
      await redis.del(key);
      return;
    }
    memoryCache.delete(key);
  },

  async zadd(key: string, score: number, member: string): Promise<void> {
    if (redis && redisAvailable) {
      await redis.zadd(key, score, member);
    }
  },

  async zrevrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]> {
    if (redis && redisAvailable) {
      if (withScores) {
        return redis.zrevrange(key, start, stop, 'WITHSCORES');
      }
      return redis.zrevrange(key, start, stop);
    }
    return [];
  },

  async zrevrank(key: string, member: string): Promise<number | null> {
    if (redis && redisAvailable) {
      return redis.zrevrank(key, member);
    }
    return null;
  },
};
