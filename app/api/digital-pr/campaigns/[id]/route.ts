import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getRequiredUserId();
    const { id } = await params;
    const campaign = await prisma.prCampaign.findFirst({
      where: { id, userId },
      include: { coverages: { orderBy: { createdAt: "desc" } } },
    });
    if (!campaign) return fail("Campaign not found", 404);
    return ok(campaign);
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to fetch campaign");
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const { id } = await params;
    const body = (await req.json()) as {
      title?: string;
      status?: string;
      pressRelease?: string;
      pitchTemplate?: string;
      targetPublications?: unknown[];
    };

    const campaign = await prisma.prCampaign.updateMany({
      where: { id, userId },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.status && { status: body.status }),
        ...(body.pressRelease !== undefined && { pressRelease: body.pressRelease }),
        ...(body.pitchTemplate !== undefined && { pitchTemplate: body.pitchTemplate }),
        ...(body.targetPublications !== undefined && {
          targetPublications: body.targetPublications?.length ? JSON.stringify(body.targetPublications) : null,
        }),
      },
    });
    if (!campaign.count) return fail("Campaign not found", 404);
    return ok({ updated: true });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to update campaign");
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const { id } = await params;
    await prisma.prCampaign.deleteMany({ where: { id, userId } });
    return ok({ deleted: true });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to delete campaign");
  }
}
