import { prisma } from "@/lib/db";
import { computeNextAgentRunFromConfig } from "@/lib/services/agent-automation-service";
import type { AgentHeartbeatStatus } from "@/lib/agent/types";

export async function getAgentHeartbeatStatus(userId: string): Promise<AgentHeartbeatStatus> {
  const [config, stageCounts, lastRun, activeRun] = await Promise.all([
    prisma.agentConfig.findUnique({ where: { userId } }),
    prisma.backlinkProspect.groupBy({
      by: ["stage"],
      where: { userId },
      _count: { id: true },
    }),
    prisma.agentRun.findFirst({
      where: { userId, status: "completed" },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    }),
    prisma.agentRun.findFirst({
      where: { userId, status: "running" },
      orderBy: { startedAt: "desc" },
      select: { id: true },
    }),
  ]);

  const pending: AgentHeartbeatStatus["pending"] = {
    discover: 0,
    qualify: 0,
    contact: 0,
    draft: 0,
    send: 0,
  };

  let prospectsDiscovered = 0;
  let prospectsQualified = 0;

  for (const stageCount of stageCounts) {
    prospectsDiscovered += stageCount._count.id;

    if (stageCount.stage === "discovered") pending.qualify = stageCount._count.id;
    if (stageCount.stage === "qualified") pending.contact = stageCount._count.id;
    if (stageCount.stage === "contact_found") pending.draft = stageCount._count.id;
    if (stageCount.stage === "email_drafted") pending.send = stageCount._count.id;

    if (!["discovered", "qualifying", "rejected", "failed"].includes(stageCount.stage)) {
      prospectsQualified += stageCount._count.id;
    }
  }

  const nextRun =
    config?.isEnabled
      ? computeNextAgentRunFromConfig({
          lastHeartbeatAt: config.lastHeartbeatAt,
          lastCycleQueuedAt: config.lastCycleQueuedAt,
          cycleIntervalMinutes: config.cycleIntervalMinutes || 15,
        })?.toISOString() || null
      : null;

  return {
    isRunning: Boolean(activeRun),
    lastRun: lastRun?.completedAt?.toISOString() || null,
    nextRun,
    cycleIntervalMinutes: config?.cycleIntervalMinutes || 15,
    pending,
    todayStats: {
      emailsSent: config?.emailsSentToday || 0,
      dailyLimit: config?.dailyEmailLimit || 50,
      prospectsDiscovered,
      prospectsQualified,
    },
  };
}
