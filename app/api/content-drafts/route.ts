import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { ok, fail } from "@/lib/server/response";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getRequiredUserId();
    const drafts = await prisma.contentDraft.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        keyword: true,
        title: true,
        wordCount: true,
        tone: true,
        status: true,
        createdAt: true,
        briefId: true,
      },
    });
    return ok(drafts);
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to fetch drafts");
  }
}
