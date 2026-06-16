import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/response";
import { listMonitoredLinks } from "@/lib/services/link-monitor-service";

export async function GET() {
  try {
    const userId = await getRequiredUserId();

    return ok(await listMonitoredLinks(userId));
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("List monitored links error:", error);
    return fail("Failed to fetch monitored links");
  }
}
