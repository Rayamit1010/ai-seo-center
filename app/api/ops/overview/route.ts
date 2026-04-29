import { prisma } from "@/lib/db";
import { getAIHealthSummary } from "@/lib/anthropic";
import { summarizeError } from "@/lib/errors";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { getJobQueueStatus } from "@/lib/server/job-queue";
import { logRouteTiming, measureStep } from "@/lib/server/observability";
import { getRateLimitProvider } from "@/lib/server/rate-limit";
import { fail, ok } from "@/lib/server/response";

export async function GET() {
  const startedAt = performance.now();
  try {
    const userId = await getRequiredUserId();

    const timedQueries = await Promise.all([
      measureStep("ai-health", () => getAIHealthSummary(userId)),
      measureStep("job-queue-status", () => getJobQueueStatus(userId)),
      measureStep("recent-ai-events", () =>
        prisma.aIProviderEvent.findMany({
          where: {
            userId,
            success: false,
          },
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      ),
    ]);

    const [
      { value: aiHealth },
      { value: queueStatus },
      { value: recentAiEvents },
    ] = timedQueries;

    const incidents = [
      ...queueStatus.recentEvents
        .filter((event) => !event.success)
        .map((event) => ({
          id: event.id,
          source: "queue",
          title: event.jobName,
          createdAt: event.createdAt,
          reason:
            event.reason ||
            "A background task failed, but the system caught it and kept running.",
          rawError: event.rawError,
        })),
      ...recentAiEvents.map((event) => ({
        id: event.id,
        source: "ai",
        title: `${event.providerId} ${event.task || "general"} request`,
        createdAt: event.createdAt.toISOString(),
        reason:
          summarizeError(event.errorMessage || "Unknown AI provider error").human,
        rawError: event.errorMessage,
      })),
    ]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 12);

    const providersWithIssues = aiHealth.providers.filter(
      (provider) => provider.lastError || provider.cooldownUntil || !provider.configured
    );

    const response = ok({
      generatedAt: new Date().toISOString(),
      architecture: {
        rateLimitProvider: getRateLimitProvider(),
        jobQueueProvider: queueStatus.provider,
        jobQueueRemoteOnly: queueStatus.remoteOnly,
      },
      queue: queueStatus,
      ai: {
        health: aiHealth,
        providersWithIssues,
      },
      incidents,
      summary: {
        incidentCount: incidents.length,
        pendingJobs: queueStatus.totalPending,
        healthyProviders: aiHealth.totals.healthyProviders,
        configuredProviders: aiHealth.totals.configuredProviders,
      },
    });

    logRouteTiming({
      name: "ops-overview",
      startedAt,
      steps: timedQueries.map((item) => item.timing),
      meta: { userId },
    });

    return response;
  } catch (error) {
    logRouteTiming({
      name: "ops-overview",
      startedAt,
      error,
    });
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }

    console.error("Ops overview error:", error);
    return fail("Failed to load operations overview", 500);
  }
}
