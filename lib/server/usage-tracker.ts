import { prisma } from "@/lib/db";
import { QuotaExceededError } from "@/lib/payments/types";
import { isAdminUser } from "@/lib/server/auth";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function incrementAiUsage(userId: string): Promise<void> {
  if (await isAdminUser(userId)) return; // unlimited — no tracking needed

  // 1. Get subscription plan limit
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["active", "trialing"] } },
    include: { plan: { select: { maxAiCallsPerDay: true } } },
  });

  if (!subscription) {
    throw new QuotaExceededError("aiCalls", 0, 0);
  }

  const limit = subscription.plan.maxAiCallsPerDay;
  if (limit === -1) return; // unlimited

  const today = todayKey();

  // 2. Use upsert + transaction to safely increment
  const usage = await prisma.userUsage.upsert({
    where: { userId },
    create: { userId, aiCallsToday: 0, aiCallsTotal: 0, lastResetDate: new Date(today) },
    update: {},
  });

  // Reset if it's a new day
  const usageDate = usage.lastResetDate.toISOString().slice(0, 10);
  const currentCount = usageDate === today ? usage.aiCallsToday : 0;

  if (currentCount >= limit) {
    throw new QuotaExceededError("aiCalls", currentCount, limit);
  }

  await prisma.userUsage.update({
    where: { userId },
    data: {
      aiCallsToday: usageDate === today ? { increment: 1 } : 1,
      aiCallsTotal: { increment: 1 },
      lastResetDate: usageDate === today ? undefined : new Date(today),
    },
  });
}

export async function getAiUsageToday(userId: string): Promise<{ used: number; limit: number }> {
  if (await isAdminUser(userId)) return { used: 0, limit: -1 };

  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["active", "trialing"] } },
    include: { plan: { select: { maxAiCallsPerDay: true } } },
  });

  if (!subscription) return { used: 0, limit: 0 };

  const limit = subscription.plan.maxAiCallsPerDay;
  if (limit === -1) return { used: 0, limit: -1 };

  const today = todayKey();
  const usage = await prisma.userUsage.findUnique({ where: { userId } });

  if (!usage) return { used: 0, limit };

  const usageDate = usage.lastResetDate.toISOString().slice(0, 10);
  const used = usageDate === today ? usage.aiCallsToday : 0;
  return { used, limit };
}
