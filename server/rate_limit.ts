export type RateLimitConfig = {
  windowMs: number;
  max: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

export function createRateLimiter(config: RateLimitConfig) {
  const buckets = new Map<string, Bucket>();

  return (key: string): RateLimitResult => {
    const now = Date.now();
    const existing = buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const resetAt = now + config.windowMs;
      buckets.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: config.max - 1,
        resetAt,
      };
    }

    existing.count += 1;
    if (existing.count > config.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.resetAt,
        retryAfterMs: existing.resetAt - now,
      };
    }

    return {
      allowed: true,
      remaining: config.max - existing.count,
      resetAt: existing.resetAt,
    };
  };
}
