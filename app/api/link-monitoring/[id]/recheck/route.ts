import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import { recheckLink } from "@/lib/services/link-monitor-service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const { id } = await params;

    const result = await recheckLink(userId, id);
    if (!result) return fail("Link not found", 404);

    return ok({
      id: result.prospect.id,
      linkStatus: result.prospect.linkStatus,
      linkDofollow: result.prospect.linkDofollow,
      anchorText: result.prospect.anchorText,
      lastLinkCheckAt: result.prospect.lastLinkCheckAt,
    });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Recheck link error:", error);
    return fail("Failed to recheck link");
  }
}
