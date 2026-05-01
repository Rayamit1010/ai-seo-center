import Stripe from "stripe";
import { prisma } from "@/lib/db";
import type { BillingCycle, PlanSlug } from "./types";
import { getResendClient } from "@/lib/resend";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    stripeClient = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  }
  return stripeClient;
}

function getStripePriceId(planSlug: PlanSlug, billingCycle: BillingCycle): string {
  const envMap: Record<string, string> = {
    "solo:monthly": process.env.STRIPE_PRICE_SOLO_MONTHLY ?? "",
    "solo:yearly": process.env.STRIPE_PRICE_SOLO_YEARLY ?? "",
    "agency:monthly": process.env.STRIPE_PRICE_AGENCY_MONTHLY ?? "",
    "agency:yearly": process.env.STRIPE_PRICE_AGENCY_YEARLY ?? "",
    "white-label:monthly": process.env.STRIPE_PRICE_WHITELABEL_MONTHLY ?? "",
    "white-label:yearly": process.env.STRIPE_PRICE_WHITELABEL_YEARLY ?? "",
  };
  const priceId = envMap[`${planSlug}:${billingCycle}`];
  if (!priceId) throw new Error(`Stripe price ID not configured for ${planSlug}/${billingCycle}`);
  return priceId;
}

async function getOrCreateStripeCustomer(
  stripe: Stripe,
  userId: string,
  email: string,
  name?: string | null
): Promise<string> {
  const existing = await prisma.subscription.findFirst({
    where: { userId, stripeCustomerId: { not: null } },
    select: { stripeCustomerId: true },
  });

  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { userId },
  });
  return customer.id;
}

export async function createStripeCheckoutSession(
  userId: string,
  planSlug: PlanSlug,
  billingCycle: BillingCycle,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user) throw new Error("User not found");

  const customerId = await getOrCreateStripeCustomer(stripe, userId, user.email, user.name);
  const priceId = getStripePriceId(planSlug, billingCycle);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: { userId, planSlug, billingCycle },
    },
    metadata: { userId, planSlug, billingCycle },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url, sessionId: session.id };
}

export async function createStripePortalSession(
  userId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe();

  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: "active", stripeCustomerId: { not: null } },
    select: { stripeCustomerId: true },
  });

  if (!subscription?.stripeCustomerId) {
    throw new Error("No active Stripe subscription found");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string
): Promise<void> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    throw new Error("Invalid Stripe webhook signature");
  }

  const existing = await prisma.gatewayEvent.findUnique({
    where: { gateway_eventId: { gateway: "stripe", eventId: event.id } },
  });
  if (existing?.processed) return;

  await prisma.gatewayEvent.upsert({
    where: { gateway_eventId: { gateway: "stripe", eventId: event.id } },
    create: {
      gateway: "stripe",
      eventId: event.id,
      eventType: event.type,
      payload: JSON.stringify(event.data.object),
      processed: false,
    },
    update: {},
  });

  try {
    await processStripeEvent(stripe, event);
    await prisma.gatewayEvent.update({
      where: { gateway_eventId: { gateway: "stripe", eventId: event.id } },
      data: { processed: true, processedAt: new Date() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.gatewayEvent.update({
      where: { gateway_eventId: { gateway: "stripe", eventId: event.id } },
      data: { error: message },
    });
    throw err;
  }
}

function getSubscriptionPeriod(
  sub: Stripe.Subscription
): { start: Date; end: Date } {
  // In Stripe API v2026+, period is on each subscription item
  const firstItem = sub.items?.data?.[0];
  if (firstItem?.current_period_start && firstItem?.current_period_end) {
    return {
      start: new Date(firstItem.current_period_start * 1000),
      end: new Date(firstItem.current_period_end * 1000),
    };
  }
  // Fallback: use billing_cycle_anchor as start, compute end from start_date
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  return { start: now, end: periodEnd };
}

async function processStripeEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription) break;

      const userId = session.metadata?.userId;
      const planSlug = session.metadata?.planSlug as PlanSlug | undefined;
      const billingCycle = (session.metadata?.billingCycle ?? "monthly") as BillingCycle;
      if (!userId || !planSlug) break;

      const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
      if (!plan) break;

      const stripeSubId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? "";

      const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubId, {
        expand: ["items"],
      });

      const { start, end } = getSubscriptionPeriod(stripeSubscription);

      await prisma.subscription.upsert({
        where: { stripeSubscriptionId: stripeSubscription.id },
        create: {
          userId,
          planId: plan.id,
          gateway: "stripe",
          status: "active",
          currency: "USD",
          billingCycle,
          currentPeriodStart: start,
          currentPeriodEnd: end,
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
        },
        update: {
          status: "active",
          planId: plan.id,
          currentPeriodStart: start,
          currentPeriodEnd: end,
          stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
        },
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const planSlug = sub.metadata?.planSlug as PlanSlug | undefined;
      const billingCycle = (sub.metadata?.billingCycle ?? "monthly") as BillingCycle;
      const { start, end } = getSubscriptionPeriod(sub);

      const updateData: Record<string, unknown> = {
        status: mapStripeStatus(sub.status),
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      };

      if (planSlug) {
        const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
        if (plan) {
          updateData.planId = plan.id;
          updateData.billingCycle = billingCycle;
        }
      }

      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: updateData,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: "cancelled", cancelledAt: new Date() },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubId = getInvoiceSubscriptionId(invoice);

      if (stripeSubId) {
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSubId },
          data: { status: "past_due" },
        });

        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: stripeSubId },
          include: { user: { select: { email: true, name: true } } },
        });

        if (subscription?.user?.email) {
          await sendPaymentFailedEmail(subscription.user.email, subscription.user.name);
        }
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      // Skip the initial subscription creation invoice
      if (invoice.billing_reason === "subscription_create") break;

      const stripeSubId = getInvoiceSubscriptionId(invoice);
      if (!stripeSubId) break;

      const subscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: stripeSubId },
      });
      if (!subscription) break;

      const paymentIntentId = getInvoicePaymentIntentId(invoice);

      await prisma.payment.upsert({
        where: { gatewayPaymentId: paymentIntentId ?? invoice.id },
        create: {
          userId: subscription.userId,
          subscriptionId: subscription.id,
          gateway: "stripe",
          gatewayPaymentId: paymentIntentId ?? invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency.toUpperCase(),
          status: "succeeded",
          receiptUrl: invoice.hosted_invoice_url ?? undefined,
          invoiceId: invoice.id,
        },
        update: { status: "succeeded" },
      });
      break;
    }
  }
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  // New API: subscription is nested under parent.subscription_details
  const subDetails = invoice.parent?.subscription_details;
  if (subDetails?.subscription) {
    return typeof subDetails.subscription === "string"
      ? subDetails.subscription
      : subDetails.subscription.id;
  }
  return null;
}

function getInvoicePaymentIntentId(invoice: Stripe.Invoice): string | null {
  // New API: payment intent is in invoice.payments list
  const payments = invoice.payments?.data;
  if (payments?.length) {
    const pi = payments[0].payment?.payment_intent;
    if (pi) return typeof pi === "string" ? pi : pi.id;
  }
  return null;
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  const map: Record<Stripe.Subscription.Status, string> = {
    active: "active",
    past_due: "past_due",
    canceled: "cancelled",
    trialing: "trialing",
    incomplete: "incomplete",
    incomplete_expired: "cancelled",
    unpaid: "past_due",
    paused: "paused",
  };
  return map[status] ?? "incomplete";
}

async function sendPaymentFailedEmail(email: string, name?: string | null): Promise<void> {
  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: "TechGeekStudio <billing@techgeekstudio.com>",
      to: email,
      subject: "Payment failed — action required",
      html: `
        <p>Hi ${name ?? "there"},</p>
        <p>We were unable to process your recent payment for your TechGeekStudio SEO Center subscription.</p>
        <p>Please update your payment method to avoid service interruption.</p>
        <p><a href="${process.env.NEXTAUTH_URL}/billing">Manage Billing</a></p>
        <p>— TechGeekStudio Team</p>
      `,
    });
  } catch {
    // Email failure should not break webhook processing
  }
}
