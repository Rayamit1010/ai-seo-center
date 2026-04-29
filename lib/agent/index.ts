import { prisma } from "@/lib/db";
import { processDiscoverProspects } from "./discover";
import { processQualifyProspects } from "./qualify";
import { processFindContacts } from "./find-contact";
import { processDraftEmails } from "./draft-email";
import { processSendEmails } from "./send-email";
import { processTrackResults } from "./track";
import { STALE_RUN_MS } from "./constants";
import type { AgentCycleResult, AgentLogEntry } from "./types";
import {
  completeAgentCycleLease,
  releaseAgentCycleLease,
} from "@/lib/services/agent-automation-service";

/** Main agent orchestrator — runs one cycle of pipeline processing */
export async function runAgentCycle(
  userId: string,
  campaignId?: string
): Promise<AgentCycleResult> {
  // Get agent config
  const config = await prisma.agentConfig.findUnique({ where: { userId } });
  if (!config?.isEnabled) {
    await releaseAgentCycleLease(userId);
    return { skipped: true, reason: "disabled" };
  }

  // Prevent overlapping runs
  const existingRun = await prisma.agentRun.findFirst({
    where: {
      userId,
      status: "running",
      startedAt: { gt: new Date(Date.now() - STALE_RUN_MS) },
    },
  });

  if (existingRun) {
    await releaseAgentCycleLease(userId, { queuedAt: new Date() });
    return { skipped: true, reason: "already_running" };
  }

  // Create run record
  const run = await prisma.agentRun.create({
    data: {
      userId,
      runType: "full_cycle",
      campaignId: campaignId || null,
      status: "running",
    },
  });

  const log: AgentLogEntry[] = [];
  const startTime = Date.now();

  try {
    // Process stages in priority order (time-sensitive first)

    // 1. Send pending emails (highest priority)
    if (config.autoSend) {
      await processSendEmails(
        userId,
        {
          dailyEmailLimit: config.dailyEmailLimit,
          emailsSentToday: config.emailsSentToday,
          lastResetDate: config.lastResetDate,
          fromEmail: config.fromEmail,
        },
        log
      );
    }

    // 2. Track results (check for placed backlinks)
    await processTrackResults(userId, campaignId, log);

    // 3. Draft emails for prospects with contacts
    if (config.autoDraft) {
      await processDraftEmails(userId, campaignId, log);
    }

    // 4. Find contacts for qualified prospects
    if (config.autoContact) {
      await processFindContacts(userId, campaignId, log);
    }

    // 5. Qualify discovered prospects
    if (config.autoQualify) {
      await processQualifyProspects(userId, campaignId, log);
    }

    // 6. Discover new prospects (lowest priority)
    if (config.autoDiscover) {
      await processDiscoverProspects(userId, campaignId, log);
    }

    // Update run record
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        log: JSON.stringify(log),
        itemsProcessed: log.length,
        itemsSucceeded: log.filter((l) => l.success).length,
        itemsFailed: log.filter((l) => !l.success).length,
      },
    });

    await completeAgentCycleLease(userId, new Date());

    return { processed: log.length, log };
  } catch (error) {
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        log: JSON.stringify(log),
        errorMessage:
          error instanceof Error ? error.message : "Unknown error",
      },
    });

    await completeAgentCycleLease(userId, new Date());

    return {
      processed: log.length,
      log,
    };
  }
}
