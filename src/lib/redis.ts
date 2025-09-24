// @ts-nocheck
const Redis = require('ioredis');

// Lazy, HMR-safe singleton Redis client for server-side code (CommonJS-friendly)
/* eslint-disable @typescript-eslint/no-explicit-any */
const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_URI || null;

function getRedisClient() {
  if (typeof window !== 'undefined') {
    throw new Error('getRedisClient must be used server-side only');
  }

  // @ts-ignore - attach to global to survive HMR in dev
  if (!(global as any).__redis_client) {
    if (!REDIS_URL) {
      throw new Error('REDIS_URL is not configured');
    }
    (global as any).__redis_client = new Redis(REDIS_URL);
    (global as any).__redis_client.on('error', (err: any) => {
      // eslint-disable-next-line no-console
      console.error('Redis client error', err);
    });
  }
  return (global as any).__redis_client;
}

module.exports = { getRedisClient };
module.exports = { getRedisClient };
