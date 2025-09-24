const assert = require('assert');
const sinon = require('sinon');

// require the limiter and metrics modules
const adminRateLimiter = require('../../src/lib/adminRateLimiter');
const { metrics, setReporter, createConsoleJsonReporter } = require('../../src/lib/metrics');

describe('metrics console JSON reporter', () => {
  it('should call console.log with JSON when reporter attached', async () => {
    const logStub = sinon.stub(console, 'log');
    try {
      // create and attach reporter
      const reporter = createConsoleJsonReporter({ prefix: 'METRIC: ' });
      setReporter(reporter);

      // Create a minimal fake redis client matching the eval behavior used in the limiter
      const fakeRedis = {
        eval: async () => {
          return ['1', '0'];
        },
      };

      const ip = '1.2.3.4';
      await adminRateLimiter.incrementAttempt(ip, fakeRedis);

      // console.log should have been called at least once
      assert.ok(logStub.called, 'console.log was not called');
      const first = logStub.firstCall.args[0];
      assert.ok(typeof first === 'string', 'console.log argument not string');
      assert.ok(first.startsWith('METRIC:'), 'prefix missing');
      const jsonStr = first.slice('METRIC:'.length).trim();
      const parsed = JSON.parse(jsonStr);
      assert.equal(parsed.name, 'admin.rate_limiter.attempt');
      assert.equal(parsed.ip, ip);
    } finally {
      // restore global state
      setReporter(null);
      sinon.restore();
    }
  });
});
