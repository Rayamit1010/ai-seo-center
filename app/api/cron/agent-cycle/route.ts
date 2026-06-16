import { claimDueAgentCycles } from "@/lib/services/agent-automation-service";
import { runAgentCycle } from "@/lib/agent";
import { logRouteTiming } from "@/lib/server/observability";
import { fail, ok } from "@/lib/server/response";

export const maxDuration = 300;

function isAuthorizedCronRequest(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return process.env.NODE_ENV !== "production";
  }
  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${configuredSecret}`;
}

export async function GET(request: Request) {
  const startedAt = performance.now();

  try {
    if (!isAuthorizedCronRequest(request)) {
      logRouteTiming({ name: "cron-agent-cycle", startedAt, meta: { authorized: false } });
      return fail("This endpoint needs a valid cron secret before it can run.", 401);
    }

    const now = new Date();
    const cycles = await claimDueAgentCycles(now, 5);

    const results: Array<{ userId: string; processed?: number; skipped?: boolean; reason?: string }> = [];

    for (const cycle of cycles) {
      try {
        const result = await runAgentCycle(cycle.userId);
        results.push({ userId: cycle.userId, ...result });
      } catch (err) {
        console.error(`Agent cycle failed for user ${cycle.userId}:`, err);
        results.push({ userId: cycle.userId, skipped: true, reason: "error" });
      }
    }

    logRouteTiming({
      name: "cron-agent-cycle",
      startedAt,
      meta: { cyclesRun: cycles.length },
      thresholdMs: 0,
    });

    return ok({
      ranAt: now.toISOString(),
      cyclesRun: cycles.length,
      results,
    });
  } catch (error) {
    logRouteTiming({ name: "cron-agent-cycle", startedAt, error });
    console.error("Agent cycle cron error:", error);
    return fail("The agent cycle cron run could not be completed.");
  }
}
