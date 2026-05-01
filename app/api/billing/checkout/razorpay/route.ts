import { z } from "zod";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { prisma } from "@/lib/db";
import type { PlanSlug, BillingCycle } from "@/lib/payments/types";

const schema = z.object({
  planSlug: z.enum(["solo", "agency", "white-label"]),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  currency: z.enum(["INR", "USD"]).default("INR"),
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const body = await req.json();
    const { planSlug, billingCycle, currency } = schema.parse(body);

    const activeSubscription = await prisma.subscription.findFirst({
      where: { userId, status: "active" },
    });
    if (activeSubscription) {
      return fail("You already have an active subscription", 409);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const plan = await prisma.plan.findUnique({
      where: { slug: planSlug },
      select: { name: true },
    });

    const orderResult = await createRazorpayOrder(
      userId,
      planSlug as PlanSlug,
      billingCycle as BillingCycle,
      currency as "INR" | "USD"
    );

    return ok({
      ...orderResult,
      gateway: "razorpay",
      userName: user?.name ?? "",
      userEmail: user?.email ?? "",
      planName: plan?.name ?? planSlug,
    });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    if (error instanceof z.ZodError) return fail(error.errors[0].message, 400);
    console.error("Razorpay checkout error:", error);
    return fail("Failed to create payment order");
  }
}
