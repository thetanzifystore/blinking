import { strict as assert } from 'assert';
import path from 'path';
const adminRateLimiter = require(path.resolve(__dirname, '../../src/lib/adminRateLimiter.ts'));

function createInMemoryRedis() {
  const store = new Map<string, string>();
  const expirations = new Map<string, number>();
  const now = () => Date.now();
  return {
    async get(key: string) {
      const val = store.get(key);
      const exp = expirations.get(key) || 0;
      if (!val) return null;
      if (exp && exp < now()) {
        store.delete(key);
        expirations.delete(key);
        return null;
      }
      return val;
    },
    async set(key: string, value: string, mode?: string, px?: number) {
      let expireAt = 0;
      if (typeof px === 'number') expireAt = now() + px;
      store.set(key, value);
      if (expireAt) expirations.set(key, expireAt);
      return 'OK';
    },
    async eval(script: string, numKeys: number, key: string, windowMs: number, threshold: number, nowTs: number, backoffBase: number, backoffMul: number, backoffCap: number) {
      const rec = store.get(key);
      let count = 0;
      let blockedUntil = 0;
      if (rec) {
        const parts = rec.split(':');
        count = Number(parts[0] || '0');
        blockedUntil = Number(parts[1] || '0');
      }
      if (blockedUntil > nowTs) return [String(count), String(blockedUntil)];
      count = count + 1;
      if (count >= threshold) {
        const over = count - threshold + 1;
        let exp = 1;
        for (let i = 1; i < over; i++) exp *= backoffMul;
        const backoff = Math.min(backoffBase * exp, backoffCap);
        blockedUntil = nowTs + backoff;
        store.set(key, `${count}:${blockedUntil}`);
        expirations.set(key, nowTs + windowMs);
        return [String(count), String(blockedUntil)];
      }
      store.set(key, `${count}:0`);
      expirations.set(key, nowTs + windowMs);
      return [String(count), '0'];
    }
  } as any;
}

async function run() {
  console.log('running limiter tests...');
  const ip = '9.9.9.9';
  const client = createInMemoryRedis();
  const threshold = Number(process.env.ADMIN_RATE_LIMIT_MAX) || 5;

  // under threshold
  for (let i = 0; i < threshold - 1; i++) {
    const s = await adminRateLimiter.incrementAttempt(ip, client);
    assert.equal(s.count, i + 1, 'count should increment');
    assert.equal(s.blockedUntil, 0, 'blockedUntil should be 0');
  }
  let limited = await adminRateLimiter.isRateLimited(ip, client);
  assert.equal(limited, false, 'should not be rate limited yet');

  // exceed threshold
  for (let i = 0; i < 2; i++) {
    await adminRateLimiter.incrementAttempt(ip, client);
  }
  const state = await adminRateLimiter.incrementAttempt(ip, client);
  assert.ok(state.count >= threshold, 'count should be >= threshold');
  assert.ok(typeof state.blockedUntil === 'number' && state.blockedUntil > Date.now(), 'blockedUntil should be in future');
  limited = await adminRateLimiter.isRateLimited(ip, client);
  assert.equal(limited, true, 'should be rate limited after exceeding threshold');

  console.log('limiter tests passed');
}

run().then(() => process.exit(0)).catch((err) => { console.error('limiter tests failed', err); process.exit(2); });
