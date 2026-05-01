import { z } from "zod";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/payments/stripe";

const schema = z.object({
  subscriptionId: z.string(),
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const body = await req.json();
    const { subscriptionId } = schema.parse(body);

    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, userId, status: "active" },
    });
    if (!subscription) return fail("Subscription not found", 404);

    if (subscription.gateway === "stripe" && subscription.stripeSubscriptionId) {
      const stripe = getStripe();
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { cancelAtPeriodEnd: true },
    });

    return ok({ cancelled: true, cancelAtPeriodEnd: true });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    if (error instanceof z.ZodError) return fail(error.errors[0].message, 400);
    console.error("Cancel subscription error:", error);
    return fail("Failed to cancel subscription");
  }
}
