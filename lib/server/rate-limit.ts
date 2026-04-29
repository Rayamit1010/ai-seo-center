type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  provider: "memory" | "upstash";
};

type RateLimitAdapter = {
  consume(key: string, maxRequests: number, windowMs: number): Promise<RateLimitDecision>;
};

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function pruneExpiredEntries(now: number) {
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}

const memoryRateLimiter: RateLimitAdapter = {
  async consume(key, maxRequests, windowMs) {
    const now = Date.now();

    if (memoryStore.size > 5000) {
      pruneExpiredEntries(now);
    }

    const entry = memoryStore.get(key);
    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowMs;
      memoryStore.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - 1),
        resetAt,
        provider: "memory",
      };
    }

    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        limit: maxRequests,
        remaining: 0,
        resetAt: entry.resetAt,
        provider: "memory",
      };
    }

    entry.count += 1;
    return {
      allowed: true,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - entry.count),
      resetAt: entry.resetAt,
      provider: "memory",
    };
  },
};

async function callUpstashPipeline(commands: Array<Array<string | number>>) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Upstash Redis REST credentials are not configured");
  }

  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash rate limit request failed with status ${response.status}`);
  }

  return (await response.json()) as Array<{ result?: unknown; error?: string }>;
}

const upstashRateLimiter: RateLimitAdapter = {
  async consume(key, maxRequests, windowMs) {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const windowKey = `ratelimit:${key}:${windowStart}`;
    const resetAt = windowStart + windowMs;

    const result = await callUpstashPipeline([
      ["INCR", windowKey],
      ["PEXPIRE", windowKey, windowMs],
    ]);

    const count = Number(result[0]?.result ?? 0);
    if (!Number.isFinite(count) || count <= 0) {
      throw new Error("Upstash rate limit returned an invalid counter");
    }

    return {
      allowed: count <= maxRequests,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetAt,
      provider: "upstash",
    };
  },
};

function getRateLimitAdapter(): RateLimitAdapter {
  const provider = process.env.RATE_LIMIT_PROVIDER?.toLowerCase();
  const hasUpstashConfig =
    Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
    Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

  if (provider === "upstash" && hasUpstashConfig) {
    return upstashRateLimiter;
  }

  return memoryRateLimiter;
}

export function getRateLimitProvider() {
  const provider = process.env.RATE_LIMIT_PROVIDER?.toLowerCase();
  const hasUpstashConfig =
    Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
    Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

  if (provider === "upstash" && hasUpstashConfig) {
    return "upstash";
  }

  return "memory";
}

export async function consumeRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitDecision> {
  return getRateLimitAdapter().consume(key, maxRequests, windowMs);
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  const result = await consumeRateLimit(key, maxRequests, windowMs);
  return result.allowed;
}
