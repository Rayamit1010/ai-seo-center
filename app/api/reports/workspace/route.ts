import { prisma } from "@/lib/db";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { logRouteTiming, measureStep } from "@/lib/server/observability";
import { fail, ok } from "@/lib/server/response";
import { listAudits } from "@/lib/services/audit-service";
import { listReportDeliveryLogs, listReportSchedules } from "@/lib/services/report-automation-service";
import { listReports } from "@/lib/services/report-service";

export async function GET() {
  const startedAt = performance.now();
  try {
    const userId = await getRequiredUserId();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const timedQueries = await Promise.all([
      measureStep("audits", () => listAudits(userId)),
      measureStep("reports", () => listReports(userId)),
      measureStep("schedules", () => listReportSchedules(userId)),
      measureStep("deliveries", () => listReportDeliveryLogs(userId)),
      measureStep("project-count", () => prisma.projectProfile.count({ where: { userId } })),
      measureStep("scored-prospects", () =>
        prisma.backlinkProspect.findMany({
          where: { userId, qualityScore: { not: null } },
          select: { qualityScore: true },
          take: 500,
        })
      ),
      measureStep("total-links", () =>
        prisma.backlinkProspect.count({
          where: { userId, linkAcquired: true },
        })
      ),
      measureStep("links-this-month", () =>
        prisma.backlinkProspect.count({
          where: { userId, linkAcquired: true, updatedAt: { gte: startOfMonth } },
        })
      ),
    ]);

    const [
      { value: audits },
      { value: reports },
      { value: schedules },
      { value: deliveries },
      { value: projectCount },
      { value: scoredProspects },
      { value: totalLinks },
      { value: linksThisMonth },
    ] = timedQueries;

    const averageQualityScore =
      scoredProspects.length > 0
        ? Math.round(
            scoredProspects.reduce((sum, item) => sum + (item.qualityScore || 0), 0) /
              scoredProspects.length
          )
        : 0;

    const response = ok({
      audits,
      reports,
      schedules,
      deliveries,
      projectCount,
      agentStats: {
        totalLinks,
        linksThisMonth,
        averageQualityScore,
      },
    });

    logRouteTiming({
      name: "reports-workspace",
      startedAt,
      steps: timedQueries.map((item) => item.timing),
      meta: { userId },
    });

    return response;
  } catch (error) {
    logRouteTiming({
      name: "reports-workspace",
      startedAt,
      error,
    });
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Reports workspace error:", error);
    return fail("The reports workspace could not be loaded right now.");
  }
}
