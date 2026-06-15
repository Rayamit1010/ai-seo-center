import { z } from "zod";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { createMonitor, listMonitors, MonitorLimitError } from "@/lib/services/monitor-service";

export const dynamic = "force-dynamic";

const createMonitorSchema = z.object({
  name: z.string().min(1).max(120),
  url: z.string().url(),
  frequency: z.enum(["daily", "weekly"]).default("weekly"),
});

export async function GET() {
  try {
    const userId = await getRequiredUserId();
    return ok(await listMonitors(userId));
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("List site monitors error:", error);
    return fail("Could not load site monitors.");
  }
}

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const body = await req.json();
    const data = createMonitorSchema.parse(body);

    const monitor = await createMonitor(userId, data);
    return ok(monitor);
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    if (error instanceof SyntaxError) {
      return fail("Invalid JSON body.", 400);
    }
    if (error instanceof z.ZodError) {
      return fail(error.errors[0]?.message ?? "Invalid input.", 400);
    }
    if (error instanceof MonitorLimitError) {
      return fail(
        `Site monitor limit reached (${error.current}/${error.limit}). Upgrade your plan to monitor more sites.`,
        402
      );
    }
    console.error("Create site monitor error:", error);
    return fail("Could not create the site monitor.");
  }
}
