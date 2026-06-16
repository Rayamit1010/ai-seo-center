import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { fail, ok } from "@/lib/server/response";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const userId = await getRequiredUserId();
    const campaigns = await prisma.prCampaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { coverages: true } } },
    });
    return ok(campaigns);
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    console.error("List PR campaigns error:", error);
    return fail("Failed to fetch campaigns");
  }
}

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const body = (await req.json()) as {
      title: string;
      topic: string;
      angle?: string;
      niche?: string;
      keyMessages?: string[];
      pressRelease?: string;
      pitchTemplate?: string;
      targetPublications?: unknown[];
    };

    if (!body.title?.trim() || !body.topic?.trim()) return fail("Title and topic are required", 400);

    const campaign = await prisma.prCampaign.create({
      data: {
        userId,
        title: body.title,
        topic: body.topic,
        angle: body.angle,
        niche: body.niche,
        keyMessages: body.keyMessages?.length ? JSON.stringify(body.keyMessages) : null,
        pressRelease: body.pressRelease,
        pitchTemplate: body.pitchTemplate,
        targetPublications: body.targetPublications?.length ? JSON.stringify(body.targetPublications) : null,
      },
    });
    return ok(campaign, { status: 201 });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    console.error("Create PR campaign error:", error);
    return fail("Failed to create campaign");
  }
}
