import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/server/response";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getKeywordSuggestions, type KeywordData } from "@/lib/keyword-research/dataforseo-keywords";

export const dynamic = "force-dynamic";

const schema = z.object({
  seedKeyword: z.string().min(1).max(200),
  country: z.enum(["IN", "US", "GB", "AU", "CA"]).default("IN"),
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const allowed = await checkRateLimit(`keyword-suggestions:${userId}`, 20, 60 * 60 * 1000);
    if (!allowed) {
      return fail("Rate limit exceeded. Try again in an hour.", 429);
    }

    const body = await req.json();
    const { seedKeyword, country } = schema.parse(body);

    // Check for cached result within last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cached = await prisma.keywordResearch2.findFirst({
      where: {
        userId,
        seedKeyword: seedKeyword.toLowerCase().trim(),
        createdAt: { gte: oneDayAgo },
      },
      orderBy: { createdAt: "desc" },
    });

    if (cached) {
      let keywords: KeywordData[] = [];
      try {
        keywords = JSON.parse(cached.results) as KeywordData[];
      } catch {
        // ignore parse error, re-fetch
      }
      if (keywords.length > 0) {
        return ok({ keywords, cached: true, researchId: cached.id });
      }
    }

    const keywords = await getKeywordSuggestions(seedKeyword, country);

    const record = await prisma.keywordResearch2.create({
      data: {
        userId,
        seedKeyword: seedKeyword.toLowerCase().trim(),
        results: JSON.stringify(keywords),
        source: "dataforseo",
      },
    });

    return ok({ keywords, cached: false, researchId: record.id });
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    if (isInvalidOriginError(error)) return fail("Invalid request origin", 403);
    if (error instanceof z.ZodError) return fail(error.errors[0].message, 400);
    console.error("Keyword suggestions error:", error);
    return fail("Failed to fetch keyword suggestions");
  }
}
