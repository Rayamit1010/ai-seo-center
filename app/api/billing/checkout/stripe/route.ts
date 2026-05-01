import { z } from "zod";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { createStripeCheckoutSession } from "@/lib/payments/stripe";
import { prisma } from "@/lib/db";
import type { PlanSlug, BillingCycle } from "@/lib/payments/types";

const schema = z.object({
  planSlug: z.enum(["solo", "agency", "white-label"]),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const body = await req.json();
    const { planSlug, billingCycle } = schema.parse(body);

    const activeSubscription = await prisma.subscription.findFirst({
      where: { userId, status: "active" },
    });
    if (activeSubscription) {
      return fail("You already have an active subscription", 409);
    }

    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const { url, sessionId } = await createStripeCheckoutSession(
      userId,
      planSlug as PlanSlug,
      billingCycle as BillingCycle,
      `${appUrl}/billing?success=1`,
      `${appUrl}/billing?cancelled=1`
    );

    return ok({ url, sessionId, gateway: "stripe" });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    if (error instanceof z.ZodError) return fail(error.errors[0].message, 400);
    console.error("Stripe checkout error:", error);
    return fail("Failed to create checkout session");
  }
}
