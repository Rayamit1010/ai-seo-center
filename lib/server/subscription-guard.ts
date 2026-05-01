import { prisma } from "@/lib/db";
import {
  PaymentRequiredError,
  QuotaExceededError,
  type FeatureLimitResult,
  type SubscriptionWithPlan,
} from "@/lib/payments/types";

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
  feature: "projects" | "keywords" | "teamMembers"
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
    default:
      return { allowed: true, current: 0, limit: -1, feature };
  }
}

export { PaymentRequiredError, QuotaExceededError };
