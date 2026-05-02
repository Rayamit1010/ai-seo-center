import { consumeRateLimit } from "@/lib/server/rate-limit"
import { prisma } from "@/lib/db"

export type UserTier = "free" | "solo" | "agency" | "whitelabel"

interface RateLimitConfig {
  aiCallsPerHour: number
  researchPerHour: number
}

const TIER_LIMITS: Record<UserTier, RateLimitConfig> = {
  free:       { aiCallsPerHour: 20,   researchPerHour: 5 },
  solo:       { aiCallsPerHour: 200,  researchPerHour: 50 },
  agency:     { aiCallsPerHour: 1000, researchPerHour: 200 },
  whitelabel: { aiCallsPerHour: -1,   researchPerHour: -1 },  // unlimited
}

/**
 * Determines a user's rate limit tier from their active subscription.
 * Falls back to "free" if no active subscription.
 */
export async function getUserTier(userId: string): Promise<UserTier> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["active", "trialing"] } },
    include: { plan: { select: { slug: true } } },
  })
  if (!sub) return "free"
  const slug = sub.plan.slug
  if (slug === "white-label") return "whitelabel"
  if (slug === "agency") return "agency"
  if (slug === "solo") return "solo"
  return "free"
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number  // unix timestamp ms
}

/**
 * Apply tier-based rate limiting for AI calls.
 */
export async function rateLimitAiCall(userId: string, tier: UserTier): Promise<RateLimitResult> {
  const limit = TIER_LIMITS[tier].aiCallsPerHour
  if (limit === -1) return { success: true, limit: -1, remaining: -1, reset: 0 }
  const result = await consumeRateLimit(`ai:${userId}`, limit, 3_600_000)
  return {
    success: result.allowed,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.resetAt,
  }
}

/**
 * Apply tier-based rate limiting for research calls (keyword research, brief gen, etc.)
 */
export async function rateLimitResearch(userId: string, tier: UserTier): Promise<RateLimitResult> {
  const limit = TIER_LIMITS[tier].researchPerHour
  if (limit === -1) return { success: true, limit: -1, remaining: -1, reset: 0 }
  const result = await consumeRateLimit(`research:${userId}`, limit, 3_600_000)
  return {
    success: result.allowed,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.resetAt,
  }
}

/**
 * Returns standard rate limit response headers.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit === -1 ? "unlimited" : String(result.limit),
    "X-RateLimit-Remaining": result.remaining === -1 ? "unlimited" : String(result.remaining),
    "X-RateLimit-Reset": result.reset === 0 ? "0" : String(Math.ceil(result.reset / 1000)),
  }
}
