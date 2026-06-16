import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import { recheckCitation } from "@/lib/services/citation-service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const { id } = await params;

    const result = await recheckCitation(userId, id);
    if (!result) return fail("Citation not found or no listing URL set", 404);

    return ok({
      id: result.citation.id,
      status: result.citation.status,
      nameMatch: result.citation.nameMatch,
      addressMatch: result.citation.addressMatch,
      phoneMatch: result.citation.phoneMatch,
      lastCheckedAt: result.citation.lastCheckedAt,
    });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("That request came from an unexpected origin.", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    console.error("Recheck citation error:", error);
    return fail("Failed to recheck citation");
  }
}
