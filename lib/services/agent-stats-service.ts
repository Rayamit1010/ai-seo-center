import { getAIHealthSummary } from "@/lib/anthropic";
import type { PipelineStats } from "@/lib/agent/types";
import { prisma } from "@/lib/db";
import { measureStep } from "@/lib/server/observability";

const AGENT_STATS_CACHE_TTL_MS = 15_000;

type AgentStatsCacheEntry = {
  expiresAt: number;
  stats: PipelineStats;
};

const globalForAgentStats = globalThis as unknown as {
  __agentStatsCache?: Map<string, AgentStatsCacheEntry>;
};

const agentStatsCache =
  globalForAgentStats.__agentStatsCache ??
  (globalForAgentStats.__agentStatsCache = new Map<string, AgentStatsCacheEntry>());

export function invalidateAgentStatsCache(userId?: string) {
  if (userId) {
    agentStatsCache.delete(userId);
    return;
  }

  agentStatsCache.clear();
}

export async function getAgentStats(
  userId: string,
  options?: { forceFresh?: boolean }
) {
  const now = Date.now();
  const cached = agentStatsCache.get(userId);

  if (!options?.forceFresh && cached && cached.expiresAt > now) {
    return {
      stats: cached.stats,
      timings: [{ label: "cache-hit", durationMs: 0 }],
      cacheStatus: "hit" as const,
    };
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const timedQueries = await Promise.all([
    measureStep("agent-config", () => prisma.agentConfig.findUnique({ where: { userId } })),
    measureStep("stage-counts", () =>
      prisma.backlinkProspect.groupBy({
        by: ["stage"],
        where: { userId },
        _count: { id: true },
      })
    ),
    measureStep("campaign-count", () => prisma.backlinkCampaign.count({ where: { userId } })),
    measureStep("sent-count", () =>
      prisma.emailQueue.count({
        where: { prospect: { userId }, status: "sent", emailType: "initial" },
      })
    ),
    measureStep("replied-count", () =>
      prisma.backlinkProspect.count({
        where: { userId, stage: "replied" },
      })
    ),
    measureStep("link-count", () =>
      prisma.backlinkProspect.count({
        where: { userId, linkAcquired: true },
      })
    ),
    measureStep("scored-prospects", () =>
      prisma.backlinkProspect.findMany({
        where: { userId, qualityScore: { not: null } },
        select: { qualityScore: true, stageError: true },
        take: 500,
      })
    ),
    measureStep("links-this-month", () =>
      prisma.backlinkProspect.count({
        where: { userId, linkAcquired: true, updatedAt: { gte: startOfMonth } },
      })
    ),
    measureStep("top-campaigns", () =>
      prisma.backlinkCampaign.findMany({
        where: { userId },
        orderBy: [{ totalLinks: "desc" }, { totalProspects: "desc" }],
        take: 5,
        select: {
          id: true,
          name: true,
          totalProspects: true,
          totalLinks: true,
          totalSent: true,
          totalReplied: true,
        },
      })
    ),
    measureStep("ai-health", () => getAIHealthSummary(userId)),
  ]);

  const [
    { value: config },
    { value: stageCounts },
    { value: campaigns },
    { value: totalSent },
    { value: totalReplied },
    { value: totalLinks },
    { value: scoredProspects },
    { value: linksThisMonth },
    { value: topCampaigns },
    { value: aiHealth },
  ] = timedQueries;

  const stages: Record<string, number> = {};
  let totalProspects = 0;
  for (const count of stageCounts) {
    stages[count.stage] = count._count.id;
    totalProspects += count._count.id;
  }

  const highQualityProspects = scoredProspects.filter(
    (prospect) => (prospect.qualityScore || 0) >= 70
  ).length;
  const lowRiskProspects = scoredProspects.filter(
    (prospect) => !(prospect.stageError || "").toLowerCase().includes("spam")
  ).length;
  const averageQualityScore =
    scoredProspects.length > 0
      ? Math.round(
          scoredProspects.reduce(
            (sum, prospect) => sum + (prospect.qualityScore || 0),
            0
          ) / scoredProspects.length
        )
      : 0;

  const stats: PipelineStats = {
    stages,
    campaigns,
    totalProspects,
    totalSent,
    totalReplied,
    totalLinks,
    highQualityProspects,
    averageQualityScore,
    lowRiskProspects,
    linksThisMonth,
    replyRate: totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0,
    conversionRate: totalSent > 0 ? Math.round((totalLinks / totalSent) * 100) : 0,
    emailsSentToday: config?.emailsSentToday || 0,
    dailyLimit: config?.dailyEmailLimit || 50,
    topCampaigns,
    aiHealth,
  };

  agentStatsCache.set(userId, {
    stats,
    expiresAt: now + AGENT_STATS_CACHE_TTL_MS,
  });

  return {
    stats,
    timings: timedQueries.map((item) => item.timing),
    cacheStatus: "miss" as const,
  };
}
