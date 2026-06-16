import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import { removeCitation } from "@/lib/services/citation-service";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const { id } = await params;

    await removeCitation(userId, id);
    return ok({ deleted: true });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("That request came from an unexpected origin.", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    console.error("Delete citation error:", error);
    return fail("Failed to delete citation");
  }
}
