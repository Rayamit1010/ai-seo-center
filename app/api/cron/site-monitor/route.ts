import { ok, fail } from "@/lib/server/response";
import { runDueMonitors } from "@/lib/services/monitor-service";

export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail closed in production — no secret means no access
    return process.env.NODE_ENV !== "production";
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return fail("Unauthorized", 401);
  }

  try {
    const result = await runDueMonitors();
    return ok({
      ...result,
      message: `Started ${result.started}/${result.claimed} due monitor audit(s).`,
    });
  } catch (error) {
    console.error("Cron site-monitor error:", error);
    return fail("The site monitor cron job could not be completed.");
  }
}
