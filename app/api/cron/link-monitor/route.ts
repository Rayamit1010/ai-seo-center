import { ok, fail } from "@/lib/server/response";
import { runLinkChecks } from "@/lib/services/link-monitor-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const result = await runLinkChecks();
    return ok({
      ...result,
      message: `Checked ${result.checked} link(s); sent ${result.alerted} lost-link alert(s).`,
    });
  } catch (error) {
    console.error("Cron link-monitor error:", error);
    return fail("The link monitor cron job could not be completed.");
  }
}
