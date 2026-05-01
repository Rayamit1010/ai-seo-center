import { prisma } from "@/lib/db";
import { QuotaExceededError } from "@/lib/payments/types";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function incrementAiUsage(userId: string): Promise<void> {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["active", "trialing"] } },
    include: { plan: { select: { maxAiCallsPerDay: true } } },
  });

  if (!subscription) {
    throw new QuotaExceededError("aiCalls", 0, 0);
  }

  const limit = subscription.plan.maxAiCallsPerDay;

  // -1 means unlimited
  if (limit === -1) return;

  const agentConfig = await prisma.agentConfig.findUnique({
    where: { userId },
    select: { emailsSentToday: true, lastResetDate: true },
  });

  const today = todayKey();

  if (!agentConfig) {
    await prisma.agentConfig.upsert({
      where: { userId },
      create: { userId, emailsSentToday: 1, lastResetDate: today },
      update: { emailsSentToday: 1, lastResetDate: today },
    });
    return;
  }

  const currentDate = agentConfig.lastResetDate;
  const currentCount = currentDate === today ? agentConfig.emailsSentToday : 0;

  if (currentCount >= limit) {
    throw new QuotaExceededError("aiCalls", currentCount, limit);
  }

  await prisma.agentConfig.update({
    where: { userId },
    data: {
      emailsSentToday: currentDate === today ? { increment: 1 } : 1,
      lastResetDate: today,
    },
  });
}

export async function getAiUsageToday(userId: string): Promise<{ used: number; limit: number }> {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["active", "trialing"] } },
    include: { plan: { select: { maxAiCallsPerDay: true } } },
  });

  if (!subscription) return { used: 0, limit: 0 };

  const limit = subscription.plan.maxAiCallsPerDay;
  if (limit === -1) return { used: 0, limit: -1 };

  const today = todayKey();
  const agentConfig = await prisma.agentConfig.findUnique({
    where: { userId },
    select: { emailsSentToday: true, lastResetDate: true },
  });

  const used =
    agentConfig?.lastResetDate === today ? agentConfig.emailsSentToday : 0;

  return { used, limit };
}
