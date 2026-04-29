import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/response";
import { listReportDeliveryLogs } from "@/lib/services/report-automation-service";

export async function GET() {
  try {
    const userId = await getRequiredUserId();
    return ok(await listReportDeliveryLogs(userId));
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("List report deliveries error:", error);
    return fail("The report delivery history could not be loaded.");
  }
}
