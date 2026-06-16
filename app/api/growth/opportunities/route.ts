import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { prisma } from "@/lib/db";
import { callClaudeJSON } from "@/lib/anthropic";
import { buildGrowthOpportunitiesPrompt } from "@/lib/prompts/growth";
import { checkRateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface GrowthPlan {
  overallScore?: number;
  momentumLabel?: string;
  priorityActions?: Array<{ action: string; impact: string; effort: string; category: string }>;
  contentStrategy?: string[];
  technicalFixes?: string[];
  linkBuildingFocus?: string[];
  quarterlyGoals?: Array<{ goal: string; metric: string; target: string }>;
}

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    if (!(await checkRateLimit(`growth-plan:${userId}`, 5, 3_600_000))) {
      return fail("Rate limit exceeded. Try again later.", 429);
    }

    const [user, competitors, keywords, backlinkCount] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { website: true, company: true } }),
      prisma.competitorTracking.findMany({
        where: { userId },
        select: { domain: true, name: true },
        take: 10,
      }),
      prisma.trackedKeyword.findMany({
        where: { userId, isActive: true },
        select: {
          keyword: true,
          rankHistory: {
            orderBy: { checkedAt: "desc" },
            take: 1,
            select: { position: true, change: true },
          },
        },
        take: 30,
      }),
      prisma.backlinkProspect.count({ where: { userId, linkAcquired: true } }),
    ]);

    const improved = keywords.filter((k) => (k.rankHistory[0]?.change ?? 0) > 0).length;
    const declined = keywords.filter((k) => (k.rankHistory[0]?.change ?? 0) < 0).length;
    const top10 = keywords.filter((k) => (k.rankHistory[0]?.position ?? 999) <= 10).length;

    const prompt = buildGrowthOpportunitiesPrompt({
      userWebsite: user?.website ?? undefined,
      userNiche: user?.company ?? undefined,
      competitors: competitors.map((c) => c.name ?? c.domain),
      topKeywords: keywords.map((k) => k.keyword),
      rankSummary: { improved, declined, top10 },
      backlinkCount,
    });

    const result = await callClaudeJSON<GrowthPlan>(prompt.system, prompt.user, 3000, {
      userId,
      task: "growth-opportunities",
    });

    return ok(result);
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    console.error("Growth opportunities error:", error);
    return fail("Failed to generate growth plan");
  }
}
