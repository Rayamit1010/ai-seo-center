import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { ok, fail } from "@/lib/server/response";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getRequiredUserId();
    const { id } = await params;
    const brief = await prisma.contentBrief.findFirst({ where: { id, userId } });
    if (!brief) return fail("Brief not found", 404);
    return ok(brief);
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to fetch brief");
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getRequiredUserId();
    const { id } = await params;
    const existing = await prisma.contentBrief.findFirst({ where: { id, userId } });
    if (!existing) return fail("Brief not found", 404);
    await prisma.contentBrief.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to delete brief");
  }
}
