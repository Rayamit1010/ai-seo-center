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
    const now = new Date();

    const [deletedEvents, deletedJobs, deletedUsers] = await Promise.all([
      prisma.aIProviderEvent.deleteMany({
        where: { createdAt: { lt: ninetyDaysAgo } },
      }),
      prisma.backgroundJob.deleteMany({
        where: {
          status: { in: ["completed", "dead_letter"] },
          updatedAt: { lt: thirtyDaysAgo },
        },
      }),
      // Hard-delete accounts whose 30-day grace period has passed
      prisma.user.deleteMany({
        where: {
          scheduledDeletionAt: { not: null, lte: now },
        },
      }),
    ]);

    return ok({
      purgedAiEvents: deletedEvents.count,
      purgedOldJobs: deletedJobs.count,
      deletedAccounts: deletedUsers.count,
    });
  } catch (error) {
    console.error("Purge cron error:", error);
    return fail("Data purge failed");
  }
}
