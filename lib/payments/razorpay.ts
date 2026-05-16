import Razorpay from "razorpay";
import { createHmac } from "crypto";
import { prisma } from "@/lib/db";
import type { BillingCycle, PlanSlug } from "./types";
import { getResendClient } from "@/lib/resend";
import { buildSubscriptionConfirmationEmail } from "@/lib/email-templates-ops";
import { getOrCreateUnsubscribeToken, unsubscribeFooter } from "@/lib/server/unsubscribe";

async function sendSubscriptionConfirmation(
  userId: string,
  planName: string,
  billingCycle: string,
  amount: string,
  currency: string,
  periodEnd: Date
) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (!user?.email) return;
    const token = await getOrCreateUnsubscribeToken(userId);
    const APP_URL = process.env.NEXTAUTH_URL ?? "https://seoagent.techgeekstudio.com";
    const { subject, html } = buildSubscriptionConfirmationEmail({
      userName: user.name ?? "there",
      planName,
      billingCycle,
      amount,
      currency,
      nextBillingDate: periodEnd,
      dashboardUrl: `${APP_URL}/dashboard`,
      unsubscribeFooter: unsubscribeFooter(token),
    });
    await getResendClient().emails.send({
      from: "TechGeekStudio SEO <noreply@techgeekstudio.com>",
      to: user.email,
      subject,
      html,
    });
  } catch (err) {
    console.error("Subscription confirmation email failed:", err);
  }
}

let razorpayClient: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!razorpayClient) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error("Razorpay credentials are not configured");
    }
    razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return razorpayClient;
}

function getRazorpayPlanId(planSlug: PlanSlug, billingCycle: BillingCycle): string {
  const envMap: Record<string, string> = {
    "solo:monthly": process.env.RAZORPAY_PLAN_SOLO_MONTHLY ?? "",
    "solo:yearly": process.env.RAZORPAY_PLAN_SOLO_YEARLY ?? "",
    "agency:monthly": process.env.RAZORPAY_PLAN_AGENCY_MONTHLY ?? "",
    "agency:yearly": process.env.RAZORPAY_PLAN_AGENCY_YEARLY ?? "",
  };
  const planId = envMap[`${planSlug}:${billingCycle}`];
  if (!planId) throw new Error(`Razorpay plan ID not configured for ${planSlug}/${billingCycle}`);
  return planId;
}

export interface RazorpayOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export async function createRazorpayOrder(
  userId: string,
  planSlug: PlanSlug,
  billingCycle: BillingCycle,
  currency: "INR" | "USD" = "INR"
): Promise<RazorpayOrderResult> {
  const razorpay = getRazorpay();

  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
  if (!plan) throw new Error(`Plan not found: ${planSlug}`);

  const priceInUnits =
    currency === "INR"
      ? billingCycle === "monthly"
        ? Math.round(plan.priceMonthlyINR * 100)
        : Math.round(plan.priceYearlyINR * 100)
      : billingCycle === "monthly"
        ? Math.round(plan.priceMonthlyUSD * 100)
        : Math.round(plan.priceYearlyUSD * 100);

  const order = await razorpay.orders.create({
    amount: priceInUnits,
    currency,
    notes: { userId, planSlug, billingCycle },
  });

  return {
    orderId: order.id,
    amount: priceInUnits,
    currency,
    keyId: process.env.RAZORPAY_KEY_ID!,
  };
}

export interface RazorpaySubscriptionResult {
  subscriptionId: string;
  status: string;
  shortUrl: string;
  keyId: string;
}

export async function createRazorpaySubscription(
  userId: string,
  planSlug: PlanSlug,
  billingCycle: BillingCycle
): Promise<RazorpaySubscriptionResult> {
  const razorpay = getRazorpay();
  const planId = getRazorpayPlanId(planSlug, billingCycle);

  const subscription = (await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: billingCycle === "yearly" ? 12 : 120,
    notes: { userId, planSlug, billingCycle },
  })) as { id: string; status: string; short_url?: string };

  return {
    subscriptionId: subscription.id,
    status: subscription.status,
    shortUrl: subscription.short_url ?? "",
    keyId: process.env.RAZORPAY_KEY_ID!,
  };
}

export function verifyRazorpayPayment(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET is not configured");

  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return expectedSignature === signature;
}

export function verifyRazorpayWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");

  const expectedSignature = createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

export interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: { entity: RazorpayPaymentEntity };
    subscription?: { entity: RazorpaySubscriptionEntity };
  };
}

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  description?: string;
  error_code?: string;
  error_description?: string;
  notes?: Record<string, string>;
}

interface RazorpaySubscriptionEntity {
  id: string;
  plan_id: string;
  status: string;
  current_start: number;
  current_end: number;
  notes?: Record<string, string>;
}

export async function handleRazorpayWebhook(
  rawBody: string,
  signature: string
): Promise<void> {
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    throw new Error("Invalid Razorpay webhook signature");
  }

  const data = JSON.parse(rawBody) as RazorpayWebhookPayload;
  const eventId = `${data.event}:${Date.now()}`;
  const paymentEntity = data.payload.payment?.entity;
  const subscriptionEntity = data.payload.subscription?.entity;
  const entityId = paymentEntity?.id ?? subscriptionEntity?.id ?? eventId;
  const idempotencyKey = `${data.event}:${entityId}`;

  const existing = await prisma.gatewayEvent.findUnique({
    where: { gateway_eventId: { gateway: "razorpay", eventId: idempotencyKey } },
  });
  if (existing?.processed) return;

  await prisma.gatewayEvent.upsert({
    where: { gateway_eventId: { gateway: "razorpay", eventId: idempotencyKey } },
    create: {
      gateway: "razorpay",
      eventId: idempotencyKey,
      eventType: data.event,
      payload: rawBody,
      processed: false,
    },
    update: {},
  });

  try {
    await processRazorpayEvent(data);
    await prisma.gatewayEvent.update({
      where: { gateway_eventId: { gateway: "razorpay", eventId: idempotencyKey } },
      data: { processed: true, processedAt: new Date() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.gatewayEvent.update({
      where: { gateway_eventId: { gateway: "razorpay", eventId: idempotencyKey } },
      data: { error: message },
    });
    throw err;
  }
}

async function processRazorpayEvent(data: RazorpayWebhookPayload): Promise<void> {
  const payment = data.payload.payment?.entity;
  const subscription = data.payload.subscription?.entity;

  switch (data.event) {
    case "payment.captured": {
      if (!payment) break;
      const notes = payment.notes ?? {};
      const userId = notes.userId;
      const planSlug = notes.planSlug as PlanSlug | undefined;
      const billingCycle = (notes.billingCycle ?? "monthly") as BillingCycle;
      if (!userId || !planSlug) break;

      const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
      if (!plan) break;

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === "yearly" ? 12 : 1));

      const sub = await prisma.subscription.upsert({
        where: { razorpaySubscriptionId: payment.order_id ?? payment.id },
        create: {
          userId,
          planId: plan.id,
          gateway: "razorpay",
          status: "active",
          currency: payment.currency,
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          razorpaySubscriptionId: payment.order_id ?? payment.id,
        },
        update: {
          status: "active",
          planId: plan.id,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      await prisma.payment.upsert({
        where: { gatewayPaymentId: payment.id },
        create: {
          userId,
          subscriptionId: sub.id,
          gateway: "razorpay",
          gatewayPaymentId: payment.id,
          gatewayOrderId: payment.order_id,
          amount: payment.amount,
          currency: payment.currency,
          status: "succeeded",
          paymentMethod: payment.method,
        },
        update: { status: "succeeded" },
      });
      break;
    }

    case "subscription.activated": {
      if (!subscription) break;
      const notes = subscription.notes ?? {};
      const userId = notes.userId;
      const planSlug = notes.planSlug as PlanSlug | undefined;
      const billingCycle = (notes.billingCycle ?? "monthly") as BillingCycle;
      if (!userId || !planSlug) break;

      const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
      if (!plan) break;

      await prisma.subscription.upsert({
        where: { razorpaySubscriptionId: subscription.id },
        create: {
          userId,
          planId: plan.id,
          gateway: "razorpay",
          status: "active",
          currency: "INR",
          billingCycle,
          currentPeriodStart: new Date(subscription.current_start * 1000),
          currentPeriodEnd: new Date(subscription.current_end * 1000),
          razorpaySubscriptionId: subscription.id,
        },
        update: {
          status: "active",
          currentPeriodStart: new Date(subscription.current_start * 1000),
          currentPeriodEnd: new Date(subscription.current_end * 1000),
        },
      });
      void sendSubscriptionConfirmation(userId, plan.name, billingCycle, "—", "INR", new Date(subscription.current_end * 1000));
      break;
    }

    case "subscription.cancelled": {
      if (!subscription) break;
      await prisma.subscription.updateMany({
        where: { razorpaySubscriptionId: subscription.id },
        data: { status: "cancelled", cancelledAt: new Date() },
      });
      break;
    }

    case "payment.failed": {
      if (!payment) break;
      await prisma.payment.upsert({
        where: { gatewayPaymentId: payment.id },
        create: {
          userId: payment.notes?.userId ?? "unknown",
          gateway: "razorpay",
          gatewayPaymentId: payment.id,
          gatewayOrderId: payment.order_id,
          amount: payment.amount,
          currency: payment.currency,
          status: "failed",
          paymentMethod: payment.method,
          failureReason: payment.error_description,
        },
        update: { status: "failed", failureReason: payment.error_description },
      });
      break;
    }
  }
}
