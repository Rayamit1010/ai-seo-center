import { z } from "zod";
import { ok, fail } from "@/lib/server/response";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getKeywordGap, type KeywordGapResult } from "@/lib/keyword-research/dataforseo-keywords";

export const dynamic = "force-dynamic";

interface GapResultWithScore extends KeywordGapResult {
  opportunityScore: number;
}

const schema = z.object({
  yourDomain: z.string().min(3),
  competitorDomain: z.string().min(3),
  country: z.enum(["IN", "US", "GB", "AU", "CA"]).default("IN"),
});

function calculateOpportunityScore(volume: number, position: number): number {
  // Higher volume + weaker position (higher number) = higher opportunity
  let score = 0;

  // Volume component (0-5)
  if (volume >= 10000) score += 5;
  else if (volume >= 5000) score += 4;
  else if (volume >= 1000) score += 3;
  else if (volume >= 500) score += 2;
  else score += 1;

  // Position component (0-5): competitor ranking 1-3 means it's hard to beat,
  // ranking 4-10 is medium opportunity, 11+ is high opportunity
  if (position >= 11) score += 5;
  else if (position >= 7) score += 4;
  else if (position >= 4) score += 3;
  else score += 2;

  return Math.min(10, Math.max(1, score));
}

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const allowed = await checkRateLimit(`keyword-gap:${userId}`, 10, 60 * 60 * 1000);
    if (!allowed) {
      return fail("Rate limit exceeded. Try again in an hour.", 429);
    }

    const body = await req.json();
    const { yourDomain, competitorDomain, country } = schema.parse(body);

    const rawGaps = await getKeywordGap(yourDomain, competitorDomain, country);

    const gaps: GapResultWithScore[] = rawGaps
      .map((gap) => ({
        ...gap,
        opportunityScore: calculateOpportunityScore(gap.estimatedVolume, gap.competitorPosition),
      }))
      .sort((a, b) => b.estimatedVolume - a.estimatedVolume);

    return ok({ gaps });
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    if (isInvalidOriginError(error)) return fail("Invalid request origin", 403);
    if (error instanceof z.ZodError) return fail(error.errors[0].message, 400);
    console.error("Keyword gap error:", error);
    return fail("Failed to fetch keyword gap data");
  }
}
