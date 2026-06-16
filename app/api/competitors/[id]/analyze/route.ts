import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { prisma } from "@/lib/db";
import { callClaudeJSON } from "@/lib/anthropic";
import { buildCompetitorAnalysisPrompt } from "@/lib/prompts/growth";
import { checkRateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface AnalysisResult {
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  contentGaps?: Array<{ topic: string; rationale: string }>;
  keywordOpportunities?: Array<{ keyword: string; intent: string; opportunity: string }>;
  backlinkGaps?: string[];
  quickWins?: string[];
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const { id } = await params;

    if (!(await checkRateLimit(`competitor-analyze:${userId}`, 10, 3_600_000))) {
      return fail("Rate limit exceeded. Try again later.", 429);
    }

    const competitor = await prisma.competitorTracking.findFirst({ where: { id, userId } });
    if (!competitor) return fail("Not found", 404);

    const [user, keywords] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { website: true, company: true } }),
      prisma.trackedKeyword.findMany({
        where: { userId, isActive: true },
        select: { keyword: true },
        take: 30,
      }),
    ]);

    const prompt = buildCompetitorAnalysisPrompt({
      competitorDomain: competitor.domain,
      userWebsite: user?.website ?? undefined,
      userNiche: user?.company ?? undefined,
      trackedKeywords: keywords.map((k) => k.keyword),
    });

    const result = await callClaudeJSON<AnalysisResult>(prompt.system, prompt.user, 3000, {
      userId,
      task: "competitor-analysis",
    });

    const analysis = await prisma.competitorAnalysis.create({
      data: {
        userId,
        competitorId: id,
        summary: typeof result.summary === "string" ? result.summary : "",
        strengths: JSON.stringify(Array.isArray(result.strengths) ? result.strengths : []),
        weaknesses: JSON.stringify(Array.isArray(result.weaknesses) ? result.weaknesses : []),
        contentGaps: JSON.stringify(Array.isArray(result.contentGaps) ? result.contentGaps : []),
        keywordOpportunities: JSON.stringify(
          Array.isArray(result.keywordOpportunities) ? result.keywordOpportunities : []
        ),
        backlinkGaps: JSON.stringify(Array.isArray(result.backlinkGaps) ? result.backlinkGaps : []),
        quickWins: JSON.stringify(Array.isArray(result.quickWins) ? result.quickWins : []),
      },
    });

    await prisma.competitorTracking.update({ where: { id }, data: { lastChecked: new Date() } });

    return ok(analysis, { status: 201 });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    console.error("Competitor analysis error:", error);
    return fail("Failed to analyze competitor");
  }
}
