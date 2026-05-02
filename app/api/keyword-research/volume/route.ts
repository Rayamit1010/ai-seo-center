import { z } from "zod";
import { ok, fail } from "@/lib/server/response";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getKeywordVolume } from "@/lib/keyword-research/dataforseo-keywords";

export const dynamic = "force-dynamic";

const schema = z.object({
  keywords: z.array(z.string()).min(1).max(100),
  country: z.enum(["IN", "US", "GB", "AU", "CA"]).default("IN"),
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const allowed = await checkRateLimit(`keyword-volume:${userId}`, 30, 60 * 60 * 1000);
    if (!allowed) {
      return fail("Rate limit exceeded. Try again in an hour.", 429);
    }

    const body = await req.json();
    const { keywords, country } = schema.parse(body);

    const data = await getKeywordVolume(keywords, country);

    return ok({ keywords: data });
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    if (isInvalidOriginError(error)) return fail("Invalid request origin", 403);
    if (error instanceof z.ZodError) return fail(error.errors[0].message, 400);
    console.error("Keyword volume error:", error);
    return fail("Failed to fetch keyword volume data");
  }
}
