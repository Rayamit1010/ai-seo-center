import { z } from "zod";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { verifyRazorpayPayment } from "@/lib/payments/razorpay";
import { prisma } from "@/lib/db";
import type { PlanSlug, BillingCycle } from "@/lib/payments/types";

const schema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  planSlug: z.enum(["solo", "agency", "white-label"]),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  currency: z.string().default("INR"),
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const body = await req.json();
    const data = schema.parse(body);

    const isValid = verifyRazorpayPayment(
      data.razorpay_order_id,
      data.razorpay_payment_id,
      data.razorpay_signature
    );

    if (!isValid) {
      return fail("Payment verification failed — invalid signature", 400);
    }

    const plan = await prisma.plan.findUnique({
      where: { slug: data.planSlug as PlanSlug },
    });
    if (!plan) return fail("Plan not found", 404);

    const now = new Date();
    const periodEnd = new Date(now);
    const billingCycle = data.billingCycle as BillingCycle;
    periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === "yearly" ? 12 : 1));

    const subscription = await prisma.subscription.upsert({
      where: { razorpaySubscriptionId: data.razorpay_order_id },
      create: {
        userId,
        planId: plan.id,
        gateway: "razorpay",
        status: "active",
        currency: data.currency,
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        razorpaySubscriptionId: data.razorpay_order_id,
      },
      update: {
        status: "active",
        planId: plan.id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    await prisma.payment.upsert({
      where: { gatewayPaymentId: data.razorpay_payment_id },
      create: {
        userId,
        subscriptionId: subscription.id,
        gateway: "razorpay",
        gatewayPaymentId: data.razorpay_payment_id,
        gatewayOrderId: data.razorpay_order_id,
        amount:
          billingCycle === "yearly"
            ? data.currency === "INR"
              ? plan.priceYearlyINR * 100
              : plan.priceYearlyUSD * 100
            : data.currency === "INR"
              ? plan.priceMonthlyINR * 100
              : plan.priceMonthlyUSD * 100,
        currency: data.currency,
        status: "succeeded",
        paymentMethod: "razorpay",
      },
      update: { status: "succeeded" },
    });

    return ok({ verified: true, subscriptionId: subscription.id });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    if (error instanceof z.ZodError) return fail(error.errors[0].message, 400);
    console.error("Razorpay verify error:", error);
    return fail("Payment verification failed");
  }
}
