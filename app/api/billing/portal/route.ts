import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { createStripePortalSession } from "@/lib/payments/stripe";

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const url = await createStripePortalSession(userId, `${appUrl}/billing`);

    return ok({ url });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    console.error("Portal session error:", error);
    return fail("Failed to create billing portal session");
  }
}
