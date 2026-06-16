import { ok, fail } from "@/lib/server/response";
import { runDueAutomations } from "@/lib/services/automation-service";

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
    const result = await runDueAutomations();
    return ok({ ...result, message: `Processed ${result.processed} automation workflow(s).` });
  } catch (error) {
    console.error("Cron automations error:", error);
    return fail("The automations cron job could not be completed.");
  }
}
