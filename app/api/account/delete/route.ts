import { ok, fail } from "@/lib/server/response";
import { getRequiredUserId } from "@/lib/server/auth";
import { prisma } from "@/lib/db";

const GRACE_DAYS = 30;

export async function POST() {
  try {
    const userId = await getRequiredUserId();

    const scheduledDeletionAt = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: { scheduledDeletionAt },
    });

    return ok({ scheduledDeletionAt, graceDays: GRACE_DAYS });
  } catch (error) {
    return fail("Failed to schedule account deletion");
  }
}

export async function DELETE() {
  try {
    const userId = await getRequiredUserId();

    // Cancel a previously scheduled deletion
    await prisma.user.update({
      where: { id: userId },
      data: { scheduledDeletionAt: null },
    });

    return ok({ cancelled: true });
  } catch (error) {
    return fail("Failed to cancel account deletion");
  }
}
