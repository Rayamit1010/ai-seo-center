import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { ok, fail } from "@/lib/server/response";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const userId = await getRequiredUserId();

    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: { in: ["active", "trialing", "past_due"] } },
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

    const [projectsCount, keywordsCount] = await Promise.all([
      prisma.projectProfile.count({ where: { userId } }),
      prisma.keywordResearch.count({ where: { userId } }),
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const recentPayments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        gateway: true,
        gatewayPaymentId: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
        receiptUrl: true,
      },
    });

    return ok({
      subscription,
      usage: {
        projectsCount,
        keywordsCount,
        projectsLimit: subscription?.plan.maxProjects ?? 0,
        keywordsLimit: subscription?.plan.maxKeywords ?? 0,
        aiCallsLimit: subscription?.plan.maxAiCallsPerDay ?? 0,
        teamMembersCount: 1,
        teamMembersLimit: subscription?.plan.maxTeamMembers ?? 1,
      },
      payments: recentPayments,
      hasSubscription: !!subscription,
    });
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    console.error("Subscription fetch error:", error);
    return fail("Failed to fetch subscription");
  }
}
