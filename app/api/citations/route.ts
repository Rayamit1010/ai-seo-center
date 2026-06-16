import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import { listCitations, addCitation } from "@/lib/services/citation-service";

export async function GET() {
  try {
    const userId = await getRequiredUserId();
    return ok(await listCitations(userId));
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    console.error("List citations error:", error);
    return fail("Failed to fetch citations");
  }
}

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const body = (await req.json()) as { directoryName: string; directoryUrl: string; citationUrl?: string };

    if (!body.directoryName?.trim()) return fail("Directory name is required", 400);
    if (!body.directoryUrl?.trim()) return fail("Directory URL is required", 400);

    const citation = await addCitation(userId, body);
    return ok(citation, { status: 201 });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("That request came from an unexpected origin.", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    if (error instanceof Error && error.message.includes("business profile")) return fail(error.message, 400);
    console.error("Add citation error:", error);
    return fail("Failed to add citation");
  }
}
