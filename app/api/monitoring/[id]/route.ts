import { z } from "zod";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { deleteMonitor, getMonitorDetails, updateMonitor } from "@/lib/services/monitor-service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateMonitorSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  frequency: z.enum(["daily", "weekly"]).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: Request, context: RouteContext) {
  try {
    const userId = await getRequiredUserId();
    const { id } = await context.params;

    const monitor = await getMonitorDetails(userId, id);
    if (!monitor) {
      return fail("Monitor not found.", 404);
    }

    return ok(monitor);
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Get site monitor error:", error);
    return fail("Could not load the site monitor.");
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const { id } = await context.params;

    const body = await req.json();
    const data = updateMonitorSchema.parse(body);

    const monitor = await updateMonitor(userId, id, data);
    if (!monitor) {
      return fail("Monitor not found.", 404);
    }

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
    console.error("Update site monitor error:", error);
    return fail("Could not update the site monitor.");
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const { id } = await context.params;

    const monitor = await deleteMonitor(userId, id);
    if (!monitor) {
      return fail("Monitor not found.", 404);
    }

    return ok({ id });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Delete site monitor error:", error);
    return fail("Could not delete the site monitor.");
  }
}
