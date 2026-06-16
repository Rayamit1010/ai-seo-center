import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getRequiredUserId();
    const { id } = await params;
    const coverages = await prisma.prCoverage.findMany({
      where: { campaignId: id, userId },
      orderBy: { createdAt: "desc" },
    });
    return ok(coverages);
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to fetch coverage");
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const { id: campaignId } = await params;
    const body = (await req.json()) as {
      publicationName: string;
      coverageUrl?: string;
      mentionType?: string;
      publishedAt?: string;
      dofollow?: boolean;
    };

    if (!body.publicationName?.trim()) return fail("Publication name is required", 400);

    const campaign = await prisma.prCampaign.findFirst({ where: { id: campaignId, userId } });
    if (!campaign) return fail("Campaign not found", 404);

    const coverage = await prisma.prCoverage.create({
      data: {
        userId,
        campaignId,
        publicationName: body.publicationName,
        coverageUrl: body.coverageUrl,
        mentionType: body.mentionType,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
        dofollow: body.dofollow ?? null,
      },
    });
    return ok(coverage, { status: 201 });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    console.error("Add coverage error:", error);
    return fail("Failed to add coverage");
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const { id: campaignId } = await params;
    const url = new URL(req.url);
    const covId = url.searchParams.get("covId");
    if (!covId) return fail("covId query param required", 400);

    await prisma.prCoverage.deleteMany({ where: { id: covId, campaignId, userId } });
    return ok({ deleted: true });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to delete coverage");
  }
}
