import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import { toggleWorkflow, deleteWorkflow } from "@/lib/services/automation-service";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const { id } = await params;
    const { enabled } = (await req.json()) as { enabled: boolean };

    await toggleWorkflow(userId, id, enabled);
    return ok({ updated: true });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to update workflow");
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const { id } = await params;

    await deleteWorkflow(userId, id);
    return ok({ deleted: true });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to delete workflow");
  }
}
