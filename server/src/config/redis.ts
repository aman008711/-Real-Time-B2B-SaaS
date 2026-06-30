import Redis from 'ioredis';
import { env } from './env';

let redisClient: Redis | null = null;
let isRedisConnected = false;

try {
  console.log(`🔌 [Redis] Initializing client... Target: ${env.REDIS_URI}`);
  redisClient = new Redis(env.REDIS_URI, {
    maxRetriesPerRequest: 1, // Fail fast on requests when down to prevent API hangs
    retryStrategy(times) {
      if (times > 3) {
        console.warn('⚠️ [Redis] Reached max connection retries (3). Running in fallback in-memory mode.');
        return null; // Stop reconnecting and run fallback
      }
      const delay = Math.min(times * 200, 2000);
      console.log(`🔌 [Redis] Reconnecting in ${delay}ms (Attempt ${times}/3)...`);
      return delay;
    }
  });

  redisClient.on('error', (err: any) => {
    console.error('❌ [Redis] Connection error:', err.message);
  });

  redisClient.on('connect', () => {
    console.log('✅ [Redis] Connection established successfully.');
    isRedisConnected = true;
  });

  redisClient.on('close', () => {
    console.log('🔌 [Redis] Connection closed.');
    isRedisConnected = false;
  });
} catch (err: any) {
  console.error('❌ [Redis] Initialization error:', err.message);
}

export { redisClient, isRedisConnected };
