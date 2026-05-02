import { prisma } from "@/lib/db";
import {
  PaymentRequiredError,
  QuotaExceededError,
  type FeatureLimitResult,
  type SubscriptionWithPlan,
} from "@/lib/payments/types";
import { getAiUsageToday } from "@/lib/server/usage-tracker";

export async function requireSubscription(userId: string): Promise<SubscriptionWithPlan> {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["active", "trialing"] } },
    orderBy: { createdAt: "desc" },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          slug: true,
          priceMonthlyINR: true,
          priceMonthlyUSD: true,
          priceYearlyINR: true,
          priceYearlyUSD: true,
          features: true,
          maxProjects: true,
          maxKeywords: true,
          maxAiCallsPerDay: true,
          maxTeamMembers: true,
        },
      },
    },
  });

  if (!subscription) {
    throw new PaymentRequiredError();
  }

  return subscription as unknown as SubscriptionWithPlan;
}

export async function checkFeatureLimit(
  userId: string,
  feature: "projects" | "keywords" | "teamMembers" | "aiCalls"
): Promise<FeatureLimitResult> {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["active", "trialing"] } },
    include: { plan: true },
  });

  if (!subscription) {
    return { allowed: false, current: 0, limit: 0, feature };
  }

  const plan = subscription.plan;

  switch (feature) {
    case "projects": {
      const current = await prisma.projectProfile.count({ where: { userId } });
      const limit = plan.maxProjects;
      return { allowed: limit === -1 || current < limit, current, limit, feature };
    }
    case "keywords": {
      const current = await prisma.keywordResearch.count({ where: { userId } });
      const limit = plan.maxKeywords;
      return { allowed: limit === -1 || current < limit, current, limit, feature };
    }
    case "teamMembers": {
      return { allowed: true, current: 1, limit: plan.maxTeamMembers, feature };
    }
    case "aiCalls": {
      const { used, limit } = await getAiUsageToday(userId);
      return { allowed: limit === -1 || used < limit, current: used, limit, feature };
    }
    default:
      return { allowed: true, current: 0, limit: -1, feature };
  }
}

export async function getUsageSummary(userId: string): Promise<{
  aiCallsToday: number;
  aiCallsLimit: number;
  projectsCount: number;
  projectsLimit: number;
  keywordsCount: number;
  keywordsLimit: number;
  teamMembersCount: number;
  teamMembersLimit: number;
}> {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["active", "trialing"] } },
    include: { plan: true },
  });

  if (!subscription) {
    return {
      aiCallsToday: 0, aiCallsLimit: 0,
      projectsCount: 0, projectsLimit: 0,
      keywordsCount: 0, keywordsLimit: 0,
      teamMembersCount: 0, teamMembersLimit: 0,
    };
  }

  const plan = subscription.plan;
  const [aiUsage, projectsCount, keywordsCount] = await Promise.all([
    getAiUsageToday(userId),
    prisma.projectProfile.count({ where: { userId } }),
    prisma.trackedKeyword.count({ where: { userId, isActive: true } }),
  ]);

  return {
    aiCallsToday: aiUsage.used,
    aiCallsLimit: aiUsage.limit,
    projectsCount,
    projectsLimit: plan.maxProjects,
    keywordsCount,
    keywordsLimit: plan.maxKeywords,
    teamMembersCount: 1, // simplified
    teamMembersLimit: plan.maxTeamMembers,
  };
}

export { PaymentRequiredError, QuotaExceededError };
