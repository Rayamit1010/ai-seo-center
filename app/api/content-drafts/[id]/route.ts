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
    const draft = await prisma.contentDraft.findUnique({
      where: { id, userId },
    });
    if (!draft) return fail("Not found", 404);
    return ok(draft);
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to fetch draft");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getRequiredUserId();
    const { id } = await params;
    await prisma.contentDraft.deleteMany({ where: { id, userId } });
    return ok({ deleted: true });
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to delete draft");
  }
}
