import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { ok, fail } from "@/lib/server/response";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequiredUserId();
    const { id } = await params;
    const analysis = await prisma.competitorAnalysis.findFirst({
      where: { competitorId: id, userId },
      orderBy: { createdAt: "desc" },
    });
    return ok(analysis);
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to fetch analysis");
  }
}
