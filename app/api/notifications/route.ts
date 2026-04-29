import { prisma } from "@/lib/db";
import { summarizeError } from "@/lib/errors";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { getJobQueueStatus } from "@/lib/server/job-queue";
import { fail, ok } from "@/lib/server/response";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
  createdAt: string;
  href?: string;
};

export async function GET() {
  try {
    const userId = await getRequiredUserId();

    const [queueStatus, failedAiEvents] = await Promise.all([
      getJobQueueStatus(userId),
      prisma.aIProviderEvent.findMany({
        where: {
          userId,
          success: false,
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    const queueItems: NotificationItem[] = queueStatus.recentEvents.map((event) => ({
      id: `queue-${event.id}`,
      title: event.success ? "Background task completed" : "Background task needs attention",
      message:
        event.reason ||
        (event.success
          ? "A queued job finished successfully."
          : "A queued job failed, but the system kept running safely."),
      severity: event.success ? "success" : "warning",
      createdAt: event.createdAt,
      href: "/ops",
    }));

    const aiItems: NotificationItem[] = failedAiEvents.map((event) => ({
      id: `ai-${event.id}`,
      title: `${event.providerId} request failed`,
      message: summarizeError(event.errorMessage || "Unknown AI error").human,
      severity: "error",
      createdAt: event.createdAt.toISOString(),
      href: "/ops",
    }));

    const items = [...queueItems, ...aiItems]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 10);

    if (items.length === 0) {
      items.push({
        id: "system-healthy",
        title: "System looks healthy",
        message: "No recent incidents were detected. Your AI and background jobs look stable right now.",
        severity: "success",
        createdAt: new Date().toISOString(),
        href: "/ops",
      });
    }

    return ok({
      unreadCount: items.filter((item) => item.severity !== "success").length,
      items,
    });
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }

    console.error("Notifications error:", error);
    return fail("Failed to load notifications", 500);
  }
}
