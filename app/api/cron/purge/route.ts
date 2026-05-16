import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/server/response";

export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return fail("Unauthorized", 401);
  }

  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [deletedEvents, deletedJobs] = await Promise.all([
      // Purge old AI provider telemetry (90 days)
      prisma.aIProviderEvent.deleteMany({
        where: { createdAt: { lt: ninetyDaysAgo } },
      }),
      // Purge completed/dead-letter jobs older than 30 days
      prisma.backgroundJob.deleteMany({
        where: {
          status: { in: ["completed", "dead_letter"] },
          updatedAt: { lt: thirtyDaysAgo },
        },
      }),
    ]);

    return ok({
      purgedAiEvents: deletedEvents.count,
      purgedOldJobs: deletedJobs.count,
    });
  } catch (error) {
    console.error("Purge cron error:", error);
    return fail("Data purge failed");
  }
}
