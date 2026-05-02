import { prisma } from "@/lib/db";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const userId = await getRequiredUserId();
    const { id } = await context.params;

    const keyword = await prisma.trackedKeyword.findFirst({
      where: { id, userId },
    });

    if (!keyword) {
      return fail("Keyword not found.", 404);
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const history = await prisma.rankHistory.findMany({
      where: {
        keywordId: id,
        checkedAt: { gte: ninetyDaysAgo },
      },
      orderBy: { checkedAt: "asc" },
    });

    return ok({
      id: keyword.id,
      keyword: keyword.keyword,
      targetUrl: keyword.targetUrl,
      targetDomain: keyword.targetDomain,
      country: keyword.country,
      device: keyword.device,
      lastCheckedAt: keyword.lastCheckedAt?.toISOString() ?? null,
      createdAt: keyword.createdAt.toISOString(),
      rankHistory: history.map((h) => ({
        id: h.id,
        checkedAt: h.checkedAt.toISOString(),
        position: h.position,
        previousPos: h.previousPos,
        change: h.change,
        url: h.url,
        title: h.title,
        featured: h.featured,
        device: h.device,
      })),
    });
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Get keyword history error:", error);
    return fail("Could not load keyword history.");
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const { id } = await context.params;

    const keyword = await prisma.trackedKeyword.findFirst({
      where: { id, userId },
    });

    if (!keyword) {
      return fail("Keyword not found.", 404);
    }

    await prisma.trackedKeyword.update({
      where: { id },
      data: { isActive: false },
    });

    return ok({ id });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return fail("That request came from an unexpected origin.", 403);
    }
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("Delete tracked keyword error:", error);
    return fail("Could not delete the keyword.");
  }
}
