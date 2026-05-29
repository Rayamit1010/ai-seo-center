import { ok, fail } from "@/lib/server/response";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { prisma } from "@/lib/db";

const GRACE_DAYS = 30;

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const scheduledDeletionAt = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: { scheduledDeletionAt },
    });

    return ok({ scheduledDeletionAt, graceDays: GRACE_DAYS });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to schedule account deletion");
  }
}

export async function DELETE(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    // Cancel a previously scheduled deletion
    await prisma.user.update({
      where: { id: userId },
      data: { scheduledDeletionAt: null },
    });

    return ok({ cancelled: true });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to cancel account deletion");
  }
}
