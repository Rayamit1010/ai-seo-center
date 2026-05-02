import { z } from "zod";
import { prisma } from "@/lib/db";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { checkFeatureLimit } from "@/lib/server/subscription-guard";

export const dynamic = "force-dynamic";

const addKeywordSchema = z.object({
  keyword: z.string().min(1).max(200),
  targetUrl: z.string().url(),
  country: z.enum(["IN", "US", "GB", "AU", "CA"]).default("IN"),
  device: z.enum(["desktop", "mobile"]).default("desktop"),
});

export async function GET() {
  try {
    const userId = await getRequiredUserId();

    const keywords = await prisma.trackedKeyword.findMany({
      where: { userId, isActive: true },
      include: {
        rankHistory: {
          orderBy: { checkedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = keywords.map((kw) => {
      const latest = kw.rankHistory[0] ?? null;
      return {
        id: kw.id,
        keyword: kw.keyword,
        targetUrl: kw.targetUrl,
        targetDomain: kw.targetDomain,
        country: kw.country,
        device: kw.device,
        currentPosition: latest?.position ?? null,
        previousPosition: latest?.previousPos ?? null,
        change: latest?.change ?? null,
        lastCheckedAt: kw.lastCheckedAt?.toISOString() ?? null,
        createdAt: kw.createdAt.toISOString(),
      };
    });

    return ok(rows);
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      return fail("Unauthorized", 401);
    }
    console.error("List tracked keywords error:", error);
    return fail("Could not load tracked keywords.");
  }
}

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const body = await req.json();
    const data = addKeywordSchema.parse(body);

    const targetDomain = new URL(data.targetUrl).hostname;

    const limit = await checkFeatureLimit(userId, "keywords");
    if (!limit.allowed) {
      return fail(
        `You have reached the keyword tracking limit (${limit.limit}). Upgrade your plan to track more keywords.`,
        402
      );
    }

    const keyword = await prisma.trackedKeyword.create({
      data: {
        userId,
        keyword: data.keyword,
        targetUrl: data.targetUrl,
        targetDomain,
        country: data.country,
        device: data.device,
      },
    });

    return ok({
      id: keyword.id,
      keyword: keyword.keyword,
      targetUrl: keyword.targetUrl,
      targetDomain: keyword.targetDomain,
      country: keyword.country,
      device: keyword.device,
      currentPosition: null,
      previousPosition: null,
      change: null,
      lastCheckedAt: null,
      createdAt: keyword.createdAt.toISOString(),
    });
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
    // Unique constraint violation
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return fail(
        "This keyword is already being tracked for the same domain, country, and device.",
        409
      );
    }
    console.error("Add tracked keyword error:", error);
    return fail("Could not add the keyword.");
  }
}
