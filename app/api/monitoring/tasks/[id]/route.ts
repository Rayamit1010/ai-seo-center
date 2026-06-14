import { z } from "zod";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { updateTaskStatus } from "@/lib/services/monitor-service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateTaskSchema = z.object({
  status: z.enum(["open", "resolved", "dismissed"]),
});

export async function PATCH(req: Request, context: RouteContext) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const { id } = await context.params;

    const body = await req.json();
    const { status } = updateTaskSchema.parse(body);

    const task = await updateTaskStatus(userId, id, status);
    if (!task) {
      return fail("Task not found.", 404);
    }

    return ok(task);
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    if (error instanceof z.ZodError) {
      return fail(error.errors[0]?.message ?? "Invalid input.", 400);
    }
    console.error("Update SEO task error:", error);
    return fail("Could not update the task.");
  }
}
