import { Redis } from '@upstash/redis';

// Check if Upstash credentials are configured
const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
);

let redisClient: Redis | null = null;
if (hasUpstash) {
  try {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
      token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
    });
  } catch (err) {
    console.warn('Failed to initialize Upstash Redis, using memory store:', err);
  }
}

// In-Memory Fallback Store (for local/zero-config mode)
interface MemEntry {
  val: any;
  expiresAt?: number;
}
const memoryStore = new Map<string, MemEntry>();

function getMemory(key: string): any {
  const item = memoryStore.get(key);
  if (!item) return null;
  if (item.expiresAt && Date.now() > item.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return item.val;
}

function setMemory(key: string, val: any, exSeconds?: number): void {
  const expiresAt = exSeconds ? Date.now() + exSeconds * 1000 : undefined;
  memoryStore.set(key, { val, expiresAt });
}

function incrMemory(key: string, exSeconds: number = 60): number {
  const current = getMemory(key);
  const count = (typeof current === 'number' ? current : 0) + 1;
  setMemory(key, count, exSeconds);
  return count;
}

/**
 * Serverless distributed Rate Limiter (Upstash Redis + in-memory fallback)
 */
export async function serverlessRateLimit(
  identifier: string,
  limit: number = 60,
  windowSeconds: number = 60
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const key = `ratelimit:${identifier}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  const now = Date.now();
  const reset = Math.ceil(now / (windowSeconds * 1000)) * windowSeconds;

  if (redisClient) {
    try {
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, windowSeconds);
      }
      return {
        success: count <= limit,
        remaining: Math.max(0, limit - count),
        reset,
      };
    } catch (err) {
      console.warn('Redis rate limit query failed, falling back to memory store:', err);
    }
  }

  // Memory fallback
  const count = incrMemory(key, windowSeconds);
  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
    reset,
  };
}

/**
 * Persists session data with TTL
 */
export async function persistSessionData(key: string, data: any, ttlSeconds: number = 86400): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(data), { ex: ttlSeconds });
      return;
    } catch (err) {
      console.warn('Redis set session failed, using memory store:', err);
    }
  }

  setMemory(key, data, ttlSeconds);
}

/**
 * Retrieves session data
 */
export async function retrieveSessionData<T = any>(key: string): Promise<T | null> {
  if (redisClient) {
    try {
      const raw = await redisClient.get<string>(key);
      if (raw) {
        return typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as T);
      }
    } catch (err) {
      console.warn('Redis get session failed, using memory store:', err);
    }
  }

  return getMemory(key);
}

/**
 * Deletes session data
 */
export async function deleteSessionData(key: string): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (err) {
      console.warn('Redis delete session failed:', err);
    }
  }

  memoryStore.delete(key);
}
