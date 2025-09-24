const { expect } = require('chai');
const { isRateLimited, incrementAttempt } = require('../../src/lib/adminRateLimiter');
const Redis = require('ioredis');

describe('adminRateLimiter integration (Redis)', function() {
  // This test expects a Redis server available via REDIS_URL env var or on localhost:6379
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  let client;

  before(async function() {
    this.timeout(10000);
    client = new Redis(redisUrl);
    await client.flushall();
  });

  after(async function() {
    if (client) {
      await client.flushall();
      client.disconnect();
    }
  });

  it('blocks after threshold using real Redis', async function() {
    const ip = '10.11.12.13';
    const max = Number(process.env.ADMIN_RATE_LIMIT_MAX) || 5;
    for (let i = 0; i < max; i++) {
      const s = await incrementAttempt(ip, client);
      expect(s.count).to.be.at.least(i + 1);
    }
    const res = await incrementAttempt(ip, client);
    expect(res.blockedUntil).to.be.a('number').that.is.greaterThan(Date.now());
    const limited = await isRateLimited(ip, client);
    expect(limited).to.equal(true);
  });
});
