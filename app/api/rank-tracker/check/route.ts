import { z } from "zod";
import { prisma } from "@/lib/db";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { enqueueBackgroundJob } from "@/lib/server/job-queue";

const checkSchema = z.object({
  keywordIds: z.array(z.string()).min(1).max(20),
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const allowed = await checkRateLimit(
      `rank-check:${userId}`,
      5,
      60 * 60 * 1000 // 1 hour
    );
    if (!allowed) {
      return fail("Too many check requests. You can trigger up to 5 rank checks per hour.", 429);
    }

    const body = await req.json();
    const { keywordIds } = checkSchema.parse(body);

    // Verify all keywords belong to this user
    const keywords = await prisma.trackedKeyword.findMany({
      where: { id: { in: keywordIds }, userId, isActive: true },
      select: { id: true },
    });

    if (keywords.length !== keywordIds.length) {
      return fail("One or more keywords were not found or do not belong to you.", 403);
    }

    await enqueueBackgroundJob({
      name: "rank-check",
      payload: { keywordIds, userId },
    });

    return ok({ message: "Rank check queued" });
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
    console.error("Rank check error:", error);
    return fail("Could not queue rank check.");
  }
}
