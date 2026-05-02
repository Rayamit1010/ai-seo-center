import { prisma } from "@/lib/db";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { ok, fail } from "@/lib/server/response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getRequiredUserId();

    const totalActive = await prisma.trackedKeyword.count({
      where: { userId, isActive: true },
    });

    // Get all active keywords with their latest rank history
    const keywords = await prisma.trackedKeyword.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        keyword: true,
        rankHistory: {
          orderBy: { checkedAt: "desc" },
          take: 1,
          select: {
            position: true,
            change: true,
          },
        },
      },
    });

    let improved = 0;
    let dropped = 0;
    let unchanged = 0;
    let positionSum = 0;
    let positionCount = 0;

    const keywordsWithChange: Array<{
      keyword: string;
      change: number;
      position: number | null;
    }> = [];

    for (const kw of keywords) {
      const latest = kw.rankHistory[0] ?? null;
      const change = latest?.change ?? null;
      const position = latest?.position ?? null;

      if (change !== null && change > 0) {
        improved++;
      } else if (change !== null && change < 0) {
        dropped++;
      } else {
        unchanged++;
      }

      if (position !== null) {
        positionSum += position;
        positionCount++;
      }

      if (change !== null && change !== 0) {
        keywordsWithChange.push({ keyword: kw.keyword, change, position });
      }
    }

    const avgPosition =
      positionCount > 0
        ? Math.round((positionSum / positionCount) * 10) / 10
        : null;

    const topGainers = [...keywordsWithChange]
      .filter((kw) => kw.change > 0)
      .sort((a, b) => b.change - a.change)
      .slice(0, 5);

    const topLosers = [...keywordsWithChange]
      .filter((kw) => kw.change < 0)
      .sort((a, b) => a.change - b.change)
      .slice(0, 5);

    return ok({
      totalActive,
      improved,
      dropped,
      unchanged,
      avgPosition,
      topGainers,
      topLosers,
    });
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Rank tracker overview error:", error);
    return fail("Could not load rank tracker overview.");
  }
}
