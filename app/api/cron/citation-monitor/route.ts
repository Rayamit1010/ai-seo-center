import { ok, fail } from "@/lib/server/response";
import { runCitationChecks } from "@/lib/services/citation-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) return fail("Unauthorized", 401);

  try {
    const result = await runCitationChecks();
    return ok({ ...result, message: `Checked ${result.checked} citation(s); sent ${result.alerted} alert(s).` });
  } catch (error) {
    console.error("Cron citation-monitor error:", error);
    return fail("The citation monitor cron job could not be completed.");
  }
}
