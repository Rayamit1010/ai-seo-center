import { runWorkerPass } from "@/lib/server/job-worker";
import { logRouteTiming } from "@/lib/server/observability";
import { fail, ok } from "@/lib/server/response";
import { prisma } from "@/lib/db";
import { getResendClient } from "@/lib/resend";
import { buildDeadLetterAlertEmail } from "@/lib/email-templates-ops";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://seoagent.techgeekstudio.com";
const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL ?? "admin@techgeekstudio.com";

async function alertOnDeadLetterJobs(beforeDeadLetter: number) {
  try {
    const freshDeadLetter = await prisma.backgroundJob.findMany({
      where: { status: "dead_letter" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { jobName: true, lastError: true, attempts: true },
    });

    const newCount = freshDeadLetter.length - beforeDeadLetter;
    if (newCount <= 0) return;

    const { subject, html } = buildDeadLetterAlertEmail({
      deadLetterCount: newCount,
      jobs: freshDeadLetter.slice(0, newCount),
      dashboardUrl: APP_URL,
    });

    await getResendClient().emails.send({
      from: "TechGeekStudio SEO <noreply@techgeekstudio.com>",
      to: ADMIN_EMAIL,
      subject,
      html,
    });
  } catch (err) {
    console.error("Dead-letter alert email failed:", err);
  }
}


export const maxDuration = 60;

function isAuthorizedCronRequest(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    // Fail closed in production — no secret means no access
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${configuredSecret}`;
}

export async function GET(request: Request) {
  const startedAt = performance.now();

  try {
    if (!isAuthorizedCronRequest(request)) {
      logRouteTiming({
        name: "cron-worker",
        startedAt,
        meta: { authorized: false },
      });
      return fail(
        "This worker endpoint needs a valid cron secret before it can run.",
        401
      );
    }

    const beforeDeadLetter = await prisma.backgroundJob.count({ where: { status: "dead_letter" } });
    const result = await runWorkerPass();
    void alertOnDeadLetterJobs(beforeDeadLetter);

    logRouteTiming({
      name: "cron-worker",
      startedAt,
      meta: result,
      thresholdMs: 0,
    });

    return ok({
      ranAt: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    logRouteTiming({
      name: "cron-worker",
      startedAt,
      error,
    });
    console.error("Cron worker error:", error);
    return fail("The scheduled worker run could not be completed.");
  }
}
