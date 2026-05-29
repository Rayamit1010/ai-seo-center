import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { ok, fail } from "@/lib/server/response";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequiredUserId();
    const { id } = await params;
    const deleted = await prisma.competitorTracking.deleteMany({
      where: { id, userId },
    });
    if (deleted.count === 0) return fail("Not found", 404);
    return ok({ deleted: true });
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to delete competitor");
  }
}
