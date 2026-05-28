import { ok, fail } from "@/lib/server/response";
import { getRequiredUserId } from "@/lib/server/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const userId = await getRequiredUserId();

    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        gateway: true,
        gatewayPaymentId: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
        subscription: {
          select: {
            billingCycle: true,
            plan: { select: { name: true, slug: true } },
          },
        },
      },
    });

    return ok(payments);
  } catch {
    return fail("Failed to fetch payment history");
  }
}
