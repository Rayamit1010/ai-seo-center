import { prisma } from "@/lib/db";
import { STALE_RUN_MS } from "@/lib/agent/constants";

const AGENT_CYCLE_LEASE_MS = 10 * 60 * 1000;

export function computeNextAgentRun(lastHeartbeatAt: Date | null | undefined, cycleIntervalMinutes: number) {
  const base = lastHeartbeatAt ? new Date(lastHeartbeatAt) : new Date();
  return new Date(base.getTime() + cycleIntervalMinutes * 60 * 1000);
}

function getLatestActivityAt(lastHeartbeatAt: Date | null, lastCycleQueuedAt: Date | null) {
  if (!lastHeartbeatAt) return lastCycleQueuedAt;
  if (!lastCycleQueuedAt) return lastHeartbeatAt;
  return lastHeartbeatAt > lastCycleQueuedAt ? lastHeartbeatAt : lastCycleQueuedAt;
}

export function computeNextAgentRunFromConfig(config: {
  lastHeartbeatAt: Date | null;
  lastCycleQueuedAt: Date | null;
  cycleIntervalMinutes: number;
}) {
  const latestActivityAt = getLatestActivityAt(config.lastHeartbeatAt, config.lastCycleQueuedAt);
  return latestActivityAt
    ? computeNextAgentRun(latestActivityAt, config.cycleIntervalMinutes || 15)
    : null;
}

export async function claimDueAgentCycles(now = new Date(), limit = 10) {
  const configs = await prisma.agentConfig.findMany({
    where: {
      isEnabled: true,
      OR: [{ cycleLeaseUntil: null }, { cycleLeaseUntil: { lt: now } }],
      user: {
        backlinkCampaigns: {
          some: { status: "active" },
        },
      },
    },
    orderBy: [{ lastHeartbeatAt: "asc" }, { updatedAt: "asc" }],
    take: limit * 3,
    select: {
      userId: true,
      cycleIntervalMinutes: true,
      lastHeartbeatAt: true,
      lastCycleQueuedAt: true,
    },
  });

  const activeRunUsers = new Set(
    (
      await prisma.agentRun.findMany({
        where: {
          status: "running",
          startedAt: { gt: new Date(now.getTime() - STALE_RUN_MS) },
          userId: { not: null },
        },
        select: { userId: true },
      })
    )
      .map((run) => run.userId)
      .filter((userId): userId is string => Boolean(userId))
  );

  const claimed: Array<{ userId: string; leaseUntil: Date }> = [];
  for (const config of configs) {
    if (claimed.length >= limit) {
      break;
    }

    if (activeRunUsers.has(config.userId)) {
      continue;
    }

    const nextRun = computeNextAgentRunFromConfig({
      lastHeartbeatAt: config.lastHeartbeatAt,
      lastCycleQueuedAt: config.lastCycleQueuedAt,
      cycleIntervalMinutes: config.cycleIntervalMinutes || 15,
    });
    if (nextRun && nextRun > now) {
      continue;
    }

    const leaseUntil = new Date(now.getTime() + AGENT_CYCLE_LEASE_MS);
    const claim = await prisma.agentConfig.updateMany({
      where: {
        userId: config.userId,
        isEnabled: true,
        OR: [{ cycleLeaseUntil: null }, { cycleLeaseUntil: { lt: now } }],
        lastHeartbeatAt: config.lastHeartbeatAt,
        lastCycleQueuedAt: config.lastCycleQueuedAt,
      },
      data: {
        lastCycleQueuedAt: now,
        cycleLeaseUntil: leaseUntil,
      },
    });

    if (claim.count === 1) {
      claimed.push({ userId: config.userId, leaseUntil });
    }
  }

  return claimed;
}

export async function listDueAgentCycles(now = new Date()) {
  return claimDueAgentCycles(now);
}

export async function completeAgentCycleLease(userId: string, completedAt = new Date()) {
  await prisma.agentConfig.updateMany({
    where: { userId },
    data: {
      lastHeartbeatAt: completedAt,
      lastCycleQueuedAt: null,
      cycleLeaseUntil: null,
    },
  });
}

export async function releaseAgentCycleLease(
  userId: string,
  options: {
    queuedAt?: Date | null;
    heartbeatAt?: Date | null;
  } = {}
) {
  await prisma.agentConfig.updateMany({
    where: { userId },
    data: {
      cycleLeaseUntil: null,
      lastCycleQueuedAt:
        options.queuedAt === undefined ? null : options.queuedAt,
      lastHeartbeatAt:
        options.heartbeatAt === undefined ? undefined : options.heartbeatAt,
    },
  });
}
