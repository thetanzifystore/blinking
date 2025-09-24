// src/lib/adminRateLimiter.ts
// @ts-nocheck

// Use require for compatibility with test runners
const { getRedisClient } = require("./redis");
const { metrics } = require("./metrics");

// Rate limiter using Redis INCR with PEXPIRE. Keys are per-IP.
// Exponential backoff: when attempts exceed threshold, we set a backoff TTL that grows.

function getConfig() {
  const DEFAULT_MAX = Number(process.env.ADMIN_RATE_LIMIT_MAX) || 5;
  const DEFAULT_WINDOW_MS =
    Number(process.env.ADMIN_RATE_LIMIT_WINDOW_MS) || 60 * 1000;
  const BACKOFF_BASE_MS =
    Number(process.env.ADMIN_RATE_LIMIT_BACKOFF_BASE_MS) || 1000; // base backoff 1s
  const BACKOFF_MULTIPLIER =
    Number(process.env.ADMIN_RATE_LIMIT_BACKOFF_MULTIPLIER) || 2;
  const BACKOFF_CAP_MS =
    Number(process.env.ADMIN_RATE_LIMIT_BACKOFF_CAP_MS) || 60 * 60 * 1000; // 1 hour

  function backoffForAttempt(attempts: number) {
    const exp = Math.pow(BACKOFF_MULTIPLIER, attempts - 1);
    const ms = Math.min(BACKOFF_BASE_MS * exp, BACKOFF_CAP_MS);
    return Math.round(ms);
  }

  return {
    DEFAULT_MAX,
    DEFAULT_WINDOW_MS,
    BACKOFF_BASE_MS,
    BACKOFF_MULTIPLIER,
    BACKOFF_CAP_MS,
    backoffForAttempt,
  };
}

export async function isRateLimited(ip: string, redisClient?: any) {
  const { DEFAULT_MAX } = getConfig();
  const redis = redisClient || getRedisClient();
  const key = `admin:rl:${ip}`;
  const val = await redis.get(key);
  if (!val) return false;
  const parts = val.split(":");
  const count = Number(parts[0] || "0");
  const blockedUntil = Number(parts[1] || "0");
  const now = Date.now();
  try {
    metrics &&
      typeof metrics.report === "function" &&
      metrics.report({
        name: "admin.rate_limiter.check",
        ip,
        count,
        blockedUntil,
        now,
        isLimited: !!(blockedUntil && now < blockedUntil) || count >= DEFAULT_MAX,
      });
  } catch (e) {
    // swallow metric errors
  }
  if (blockedUntil && now < blockedUntil) return true;
  return count >= DEFAULT_MAX;
}

export async function incrementAttempt(ip: string, redisClient?: any) {
  const {
    DEFAULT_WINDOW_MS,
    DEFAULT_MAX,
    BACKOFF_BASE_MS,
    BACKOFF_MULTIPLIER,
    BACKOFF_CAP_MS,
  } = getConfig();
  const redis = redisClient || getRedisClient();
  const key = `admin:rl:${ip}`;
  const now = Date.now();

  // Use a Lua script to atomically INCR and maintain a blockedUntil flag when threshold exceeded
  const script = `
    local key = KEYS[1]
    local window = tonumber(ARGV[1])
    local threshold = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    local backoffBase = tonumber(ARGV[4])
    local backoffMultiplier = tonumber(ARGV[5])
    local backoffCap = tonumber(ARGV[6])

    local raw = redis.call('GET', key)
    local count = 0
    local blockedUntil = 0
    if raw then
      local parts = {}
      for part in string.gmatch(raw, '([^:]+)') do
        table.insert(parts, part)
      end
      count = tonumber(parts[1]) or 0
      blockedUntil = tonumber(parts[2]) or 0
    end

    if blockedUntil > now then
      return {tostring(count), tostring(blockedUntil)}
    end

    count = count + 1
    local blocked = 0
    if count >= threshold then
      local over = count - threshold + 1
      local exp = 1
      for i=1, over-1 do exp = exp * backoffMultiplier end
      local backoff = math.min(backoffBase * exp, backoffCap)
      blocked = now + backoff
      redis.call('SET', key, tostring(count) .. ':' .. tostring(blocked), 'PX', window)
      return {tostring(count), tostring(blocked)}
    end

    redis.call('SET', key, tostring(count) .. ':' .. tostring(0), 'PX', window)
    return {tostring(count), tostring(0)}
  `;

  const raw = await redis.eval(
    script,
    1,
    key,
    DEFAULT_WINDOW_MS,
    DEFAULT_MAX,
    now,
    BACKOFF_BASE_MS,
    BACKOFF_MULTIPLIER,
    BACKOFF_CAP_MS
  );

  const res = Array.isArray(raw) ? (raw as any[]) : [String(raw || "0"), "0"];
  const result = {
    count: Number(res[0] || 0),
    blockedUntil: Number(res[1] || 0),
  };
  try {
    metrics &&
      typeof metrics.report === "function" &&
      metrics.report({
        name: "admin.rate_limiter.attempt",
        ip,
        ...result,
        windowMs: DEFAULT_WINDOW_MS,
      });
  } catch (e) {
    // swallow metric reporter errors
  }
  return result;
}

// CommonJS fallback for test runners
try {
  (module as any).exports = Object.assign(
    (module as any).exports || {},
    { isRateLimited, incrementAttempt }
  );
} catch (e) {
  // ignore in environments where module is not writable
}
