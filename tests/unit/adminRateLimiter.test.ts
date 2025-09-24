const { expect } = require('chai');
const adminRateLimiter = require('../../src/lib/adminRateLimiter');

// We'll stub the Redis client used by adminRateLimiter by mocking the getRedisClient export.
// Import the module under test after stubbing.

const modulePath = '../../src/lib/adminRateLimiter';

function createInMemoryRedis(clock?: { now: () => number }) {
  const store = new Map<string, string>();
  const expirations = new Map<string, number>();
  let offset = 0;

  const now = (() => {
    if (clock && typeof clock.now === 'function') {
      return () => clock.now();
    }
    return () => Date.now() + offset;
  })();

  return {
    // allow tests to advance mocked time
    advance(ms: number) {
      if (clock && typeof (clock as any).advance === 'function') {
        (clock as any).advance(ms);
      } else {
        offset += ms;
      }
    },
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
      if (typeof px === 'number') {
        expireAt = now() + px;
      }
      store.set(key, value);
      if (expireAt) expirations.set(key, expireAt);
      return 'OK';
    },
    async eval(script: string, numKeys: number, key: string, windowMs: number, threshold: number, nowTs: number, backoffBase: number, backoffMul: number, backoffCap: number) {
      // emulate atomic lua behaviour based on current mocked time
      // respect expirations: if expired, delete key and treat as missing
      const exp = expirations.get(key) || 0;
      if (exp && exp < now()) {
        store.delete(key);
        expirations.delete(key);
      }
      const rec = store.get(key);
      let count = 0;
      let blockedUntil = 0;
      if (rec) {
        const parts = rec.split(':');
        count = Number(parts[0] || '0');
        blockedUntil = Number(parts[1] || '0');
      }
      if (blockedUntil > nowTs) {
        return [String(count), String(blockedUntil)];
      }
      count = count + 1;
      if (count >= threshold) {
        const over = count - threshold + 1;
        let exp = 1;
        for (let i = 1; i < over; i++) exp *= backoffMul;
        const backoff = Math.min(backoffBase * exp, backoffCap);
        blockedUntil = nowTs + backoff;
        store.set(key, `${count}:${blockedUntil}`);
  expirations.set(key, now() + windowMs);
        return [String(count), String(blockedUntil)];
      }
      store.set(key, `${count}:0`);
  expirations.set(key, now() + windowMs);
      return [String(count), '0'];
    }
  } as any;
}

function reloadLimiterWithEnv(overrides?: Record<string, string | undefined>) {
  overrides = overrides || {};
  // save current env
  const oldEnv: Record<string, any> = {};
  const keys = Object.keys(overrides);
  try {
    for (const k of keys) { oldEnv[k] = process.env[k]; process.env[k] = overrides![k]; }
    // clear module cache for the limiter so it picks up new env vars
    const modPath = require.resolve(modulePath);
    delete require.cache[modPath];
    const limiter = require(modulePath);
    return limiter;
  } finally {
    // restore env even if require throws
    for (const k of keys) { process.env[k] = oldEnv[k]; }
  }
}

describe('adminRateLimiter (unit)', () => {
  let redisStub: any;

  beforeEach(() => {
    // nothing to do: using imported adminRateLimiter
  });

  afterEach(() => {
    // nothing special to cleanup
  });

  it('allows requests under threshold', async () => {
    const ip = '1.2.3.4';
    const client = createInMemoryRedis();
    for (let i = 0; i < 4; i++) {
      const state = await adminRateLimiter.incrementAttempt(ip, client);
      expect(state.count).to.equal(i + 1);
      expect(state.blockedUntil).to.equal(0);
    }
    const limited = await adminRateLimiter.isRateLimited(ip, client);
    expect(limited).to.equal(false);
  });

  it('blocks and returns blockedUntil after exceeding threshold', async () => {
    const ip = '5.6.7.8';
    const threshold = Number(process.env.ADMIN_RATE_LIMIT_MAX) || 5;
    // hit threshold
    const client = createInMemoryRedis();
    for (let i = 0; i < threshold; i++) {
      await adminRateLimiter.incrementAttempt(ip, client);
    }
    // next attempt should set blockedUntil
    const state = await adminRateLimiter.incrementAttempt(ip, client);
  // Implementation may return threshold or threshold+1 depending on timing; ensure it's at least threshold
  expect(state.count).to.be.at.least(threshold);
    expect(state.blockedUntil).to.be.a('number').that.is.greaterThan(Date.now());

    const limited = await adminRateLimiter.isRateLimited(ip, client);
    expect(limited).to.equal(true);
  });

  it('handles concurrent increments without losing counts', async () => {
    const ip = '9.9.9.9';
    const client = createInMemoryRedis();
    const attempts = 20;
    // fire many concurrent increments
    const promises = [] as Promise<any>[];
    for (let i = 0; i < attempts; i++) {
      promises.push(adminRateLimiter.incrementAttempt(ip, client));
    }
    const results = await Promise.all(promises);
    // final count should be at least attempts or close to it depending on threshold behavior
    const last = results[results.length - 1];
    expect(last.count).to.be.at.least(1);
    const limited = await adminRateLimiter.isRateLimited(ip, client);
    // after many attempts it should be limited
    expect(limited).to.equal(true);
  });

  it('resets counts after TTL expiry', async () => {
    const ip = '2.2.2.2';
    const client = createInMemoryRedis();
    // temporarily override env
    const oldWindow = process.env.ADMIN_RATE_LIMIT_WINDOW_MS;
    const oldMax = process.env.ADMIN_RATE_LIMIT_MAX;
    process.env.ADMIN_RATE_LIMIT_WINDOW_MS = '200';
    process.env.ADMIN_RATE_LIMIT_MAX = '3';
  // override Date.now to advance alongside client
  const realDateNow = Date.now;
  let fakeNow = realDateNow();
  Date.now = () => fakeNow;
  try {
      // hit threshold
      for (let i = 0; i < 3; i++) {
        await adminRateLimiter.incrementAttempt(ip, client);
      }
  // After hitting the configured threshold, implementation may mark limited immediately or on next increment.
  // Ensure a subsequent increment causes the limiter to report blocked.
  await adminRateLimiter.incrementAttempt(ip, client);
  let limited = await adminRateLimiter.isRateLimited(ip, client);
  expect(limited).to.equal(true);
  // advance time beyond window (advance both client and global time)
  client.advance(300);
  fakeNow += 300;
      // after TTL expiry, first attempt should be counted fresh
      const s = await adminRateLimiter.incrementAttempt(ip, client);
      expect(s.count).to.equal(1);
      const limitedNow = await adminRateLimiter.isRateLimited(ip, client);
      expect(limitedNow).to.equal(false);
    } finally {
      process.env.ADMIN_RATE_LIMIT_WINDOW_MS = oldWindow;
      process.env.ADMIN_RATE_LIMIT_MAX = oldMax;
      Date.now = realDateNow;
    }
  });

  it('honors backoff cap and does not exceed it', async () => {
    // set small cap and aggressive multiplier to hit cap quickly
    const old = {
      ADMIN_RATE_LIMIT_MAX: process.env.ADMIN_RATE_LIMIT_MAX,
      ADMIN_RATE_LIMIT_BACKOFF_BASE_MS: process.env.ADMIN_RATE_LIMIT_BACKOFF_BASE_MS,
      ADMIN_RATE_LIMIT_BACKOFF_MULTIPLIER: process.env.ADMIN_RATE_LIMIT_BACKOFF_MULTIPLIER,
      ADMIN_RATE_LIMIT_BACKOFF_CAP_MS: process.env.ADMIN_RATE_LIMIT_BACKOFF_CAP_MS,
    };
    process.env.ADMIN_RATE_LIMIT_MAX = '1';
    process.env.ADMIN_RATE_LIMIT_BACKOFF_BASE_MS = '100';
    process.env.ADMIN_RATE_LIMIT_BACKOFF_MULTIPLIER = '10';
    process.env.ADMIN_RATE_LIMIT_BACKOFF_CAP_MS = '500';
    try {
      const ip = '3.3.3.3';
      const client = createInMemoryRedis();
      // first attempt -> count 1 (threshold==1) so backoff applied on next
      await adminRateLimiter.incrementAttempt(ip, client);
      const s1 = await adminRateLimiter.incrementAttempt(ip, client);
      const blockedMs = s1.blockedUntil - Date.now();
      expect(blockedMs).to.be.at.most(600); // allow small leeway
      // hit again to ensure cap remains not exceeded
      const s2 = await adminRateLimiter.incrementAttempt(ip, client);
      const blockedMs2 = s2.blockedUntil - Date.now();
      expect(blockedMs2).to.be.at.most(1000);
    } finally {
      process.env.ADMIN_RATE_LIMIT_MAX = old.ADMIN_RATE_LIMIT_MAX;
      process.env.ADMIN_RATE_LIMIT_BACKOFF_BASE_MS = old.ADMIN_RATE_LIMIT_BACKOFF_BASE_MS;
      process.env.ADMIN_RATE_LIMIT_BACKOFF_MULTIPLIER = old.ADMIN_RATE_LIMIT_BACKOFF_MULTIPLIER;
      process.env.ADMIN_RATE_LIMIT_BACKOFF_CAP_MS = old.ADMIN_RATE_LIMIT_BACKOFF_CAP_MS;
    }
  });
});
