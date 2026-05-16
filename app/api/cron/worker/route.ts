import { runWorkerPass } from "@/lib/server/job-worker";
import { logRouteTiming } from "@/lib/server/observability";
import { fail, ok } from "@/lib/server/response";

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

    const result = await runWorkerPass();

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
