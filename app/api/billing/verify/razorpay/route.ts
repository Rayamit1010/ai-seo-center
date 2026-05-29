import { z } from "zod";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { verifyRazorpayPayment, getRazorpay } from "@/lib/payments/razorpay";
import { prisma } from "@/lib/db";
import type { BillingCycle, PlanSlug } from "@/lib/payments/types";

const schema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  currency: z.string().default("INR"),
  // planSlug / billingCycle are intentionally NOT accepted from the client body —
  // they are read from the server-side Razorpay order notes to prevent plan manipulation.
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const body = await req.json();
    const data = schema.parse(body);

    // 1. Verify HMAC — proves the orderId+paymentId pair is authentic
    const isValid = verifyRazorpayPayment(
      data.razorpay_order_id,
      data.razorpay_payment_id,
      data.razorpay_signature
    );
    if (!isValid) return fail("Payment verification failed — invalid signature", 400);

    // 2. Fetch authoritative order metadata from Razorpay server-side.
    //    This is the ONLY source of truth for planSlug / billingCycle.
    const razorpay = getRazorpay();
    const order = await razorpay.orders.fetch(data.razorpay_order_id);
    const notes = (order.notes ?? {}) as Record<string, string>;

    const planSlug = notes.planSlug as PlanSlug | undefined;
    const billingCycle = (notes.billingCycle ?? "monthly") as BillingCycle;
    const orderUserId = notes.userId;

    if (!planSlug) return fail("Order is missing plan metadata", 400);
    if (orderUserId && orderUserId !== userId) return fail("Order does not belong to this user", 403);

    // 3. Verify payment was actually captured
    const payment = await razorpay.payments.fetch(data.razorpay_payment_id);
    if (payment.status !== "captured") {
      return fail(`Payment is not captured (status: ${payment.status})`, 400);
    }

    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan) return fail("Plan not found", 404);

    // 4. Verify the paid amount matches the expected plan price
    const expectedAmount =
      billingCycle === "yearly"
        ? data.currency === "INR"
          ? plan.priceYearlyINR * 100
          : plan.priceYearlyUSD * 100
        : data.currency === "INR"
          ? plan.priceMonthlyINR * 100
          : plan.priceMonthlyUSD * 100;

    if (Number(payment.amount) < expectedAmount) {
      console.error(`Razorpay amount mismatch: paid ${payment.amount}, expected ${expectedAmount}`);
      return fail("Payment amount does not match plan price", 400);
    }

    const now = new Date();
    const periodEnd = new Date(now);
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
        amount: Number(payment.amount),
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
