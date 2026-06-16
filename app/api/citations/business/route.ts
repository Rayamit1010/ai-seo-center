import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import { getBusiness, upsertBusiness } from "@/lib/services/citation-service";

export async function GET() {
  try {
    const userId = await getRequiredUserId();
    return ok(await getBusiness(userId));
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    console.error("Get citation business error:", error);
    return fail("Failed to fetch business profile");
  }
}

export async function PUT(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const body = (await req.json()) as {
      name: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      phone?: string;
      website?: string;
      niche?: string;
    };

    if (!body.name?.trim()) return fail("Business name is required", 400);

    return ok(await upsertBusiness(userId, body));
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("That request came from an unexpected origin.", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    console.error("Upsert citation business error:", error);
    return fail("Failed to save business profile");
  }
}
