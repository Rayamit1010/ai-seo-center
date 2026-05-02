import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/server/response";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getRequiredUserId();

    const records = await prisma.keywordResearch2.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        seedKeyword: true,
        source: true,
        createdAt: true,
        results: true,
      },
    });

    const history = records.map((record) => {
      let resultCount = 0;
      try {
        const parsed = JSON.parse(record.results) as unknown[];
        resultCount = Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        resultCount = 0;
      }
      return {
        id: record.id,
        seedKeyword: record.seedKeyword,
        source: record.source,
        createdAt: record.createdAt,
        resultCount,
      };
    });

    return ok({ history });
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    console.error("Keyword history error:", error);
    return fail("Failed to fetch keyword history");
  }
}
