import { prisma } from "@/lib/db";
import type { BillingCycle, PlanSlug } from "./types";
import { getResendClient } from "@/lib/resend";
import { buildSubscriptionConfirmationEmail } from "@/lib/email-templates-ops";
import { getOrCreateUnsubscribeToken, unsubscribeFooter } from "@/lib/server/unsubscribe";

async function sendSubscriptionConfirmation(
  userId: string,
  planName: string,
  billingCycle: string,
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
      amount: "—",
      currency: "USD",
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

const PAYPAL_BASE_URL =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are not configured");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal token fetch failed: ${text}`);
  }

  const data = (await response.json()) as PayPalTokenResponse;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

function getPayPalPlanId(planSlug: PlanSlug, billingCycle: BillingCycle): string {
  const envMap: Record<string, string> = {
    "solo:monthly": process.env.PAYPAL_PLAN_SOLO_MONTHLY ?? "",
    "solo:yearly": process.env.PAYPAL_PLAN_SOLO_YEARLY ?? "",
    "agency:monthly": process.env.PAYPAL_PLAN_AGENCY_MONTHLY ?? "",
    "agency:yearly": process.env.PAYPAL_PLAN_AGENCY_YEARLY ?? "",
    "white-label:monthly": process.env.PAYPAL_PLAN_WHITELABEL_MONTHLY ?? "",
    "white-label:yearly": process.env.PAYPAL_PLAN_WHITELABEL_YEARLY ?? "",
  };
  const planId = envMap[`${planSlug}:${billingCycle}`];
  if (!planId) throw new Error(`PayPal plan ID not configured for ${planSlug}/${billingCycle}`);
  return planId;
}

function buildPayPalPlanIdToSlugMap(): Record<string, { slug: PlanSlug; cycle: BillingCycle }> {
  const entries: Array<[string, { slug: PlanSlug; cycle: BillingCycle }]> = [
    [process.env.PAYPAL_PLAN_SOLO_MONTHLY ?? "", { slug: "solo", cycle: "monthly" }],
    [process.env.PAYPAL_PLAN_SOLO_YEARLY ?? "", { slug: "solo", cycle: "yearly" }],
    [process.env.PAYPAL_PLAN_AGENCY_MONTHLY ?? "", { slug: "agency", cycle: "monthly" }],
    [process.env.PAYPAL_PLAN_AGENCY_YEARLY ?? "", { slug: "agency", cycle: "yearly" }],
    [process.env.PAYPAL_PLAN_WHITELABEL_MONTHLY ?? "", { slug: "white-label", cycle: "monthly" }],
    [process.env.PAYPAL_PLAN_WHITELABEL_YEARLY ?? "", { slug: "white-label", cycle: "yearly" }],
  ];
  return Object.fromEntries(entries.filter(([id]) => id));
}

export interface PayPalSubscriptionResult {
  subscriptionId: string;
  approvalUrl: string;
  status: string;
}

export async function createPayPalSubscription(
  userId: string,
  planSlug: PlanSlug,
  billingCycle: BillingCycle
): Promise<PayPalSubscriptionResult> {
  const accessToken = await getPayPalAccessToken();
  const planId = getPayPalPlanId(planSlug, billingCycle);

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      application_context: {
        brand_name: "TechGeekStudio SEO Center",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: `${appUrl}/billing?paypal=success`,
        cancel_url: `${appUrl}/billing?paypal=cancel`,
      },
      custom_id: userId,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal subscription creation failed: ${text}`);
  }

  const data = (await response.json()) as {
    id: string;
    status: string;
    links: Array<{ href: string; rel: string }>;
  };

  const approvalLink = data.links.find((l) => l.rel === "approve");
  if (!approvalLink) throw new Error("PayPal did not return an approval URL");

  return {
    subscriptionId: data.id,
    approvalUrl: approvalLink.href,
    status: data.status,
  };
}

export async function capturePayPalOrder(orderId: string): Promise<Record<string, unknown>> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal capture failed: ${text}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

interface PayPalWebhookVerifyBody {
  transmission_id: string;
  transmission_time: string;
  cert_url: string;
  auth_algo: string;
  transmission_sig: string;
  webhook_id: string;
  webhook_event: Record<string, unknown>;
}

export async function verifyPayPalWebhook(
  rawBody: string,
  headers: Record<string, string>
): Promise<boolean> {
  const accessToken = await getPayPalAccessToken();
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) throw new Error("PAYPAL_WEBHOOK_ID is not configured");

  const body: PayPalWebhookVerifyBody = {
    transmission_id: headers["paypal-transmission-id"] ?? "",
    transmission_time: headers["paypal-transmission-time"] ?? "",
    cert_url: headers["paypal-cert-url"] ?? "",
    auth_algo: headers["paypal-auth-algo"] ?? "",
    transmission_sig: headers["paypal-transmission-sig"] ?? "",
    webhook_id: webhookId,
    webhook_event: JSON.parse(rawBody) as Record<string, unknown>,
  };

  const response = await fetch(
    `${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) return false;

  const result = (await response.json()) as { verification_status: string };
  return result.verification_status === "SUCCESS";
}

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource: {
    id: string;
    status?: string;
    custom_id?: string;
    plan_id?: string;
    billing_info?: {
      cycle_executions?: Array<{ tenure_type: string }>;
      next_billing_time?: string;
    };
    amount?: { value: string; currency_code: string };
    payer?: { payer_id: string };
    links?: Array<{ href: string; rel: string }>;
  };
}

export async function handlePayPalWebhook(
  rawBody: string,
  headers: Record<string, string>
): Promise<void> {
  const isValid = await verifyPayPalWebhook(rawBody, headers);
  if (!isValid) throw new Error("Invalid PayPal webhook signature");

  const event = JSON.parse(rawBody) as PayPalWebhookEvent;
  const idempotencyKey = event.id;

  const existing = await prisma.gatewayEvent.findUnique({
    where: { gateway_eventId: { gateway: "paypal", eventId: idempotencyKey } },
  });
  if (existing?.processed) return;

  await prisma.gatewayEvent.upsert({
    where: { gateway_eventId: { gateway: "paypal", eventId: idempotencyKey } },
    create: {
      gateway: "paypal",
      eventId: idempotencyKey,
      eventType: event.event_type,
      payload: rawBody,
      processed: false,
    },
    update: {},
  });

  try {
    await processPayPalEvent(event);
    await prisma.gatewayEvent.update({
      where: { gateway_eventId: { gateway: "paypal", eventId: idempotencyKey } },
      data: { processed: true, processedAt: new Date() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.gatewayEvent.update({
      where: { gateway_eventId: { gateway: "paypal", eventId: idempotencyKey } },
      data: { error: message },
    });
    throw err;
  }
}

async function processPayPalEvent(event: PayPalWebhookEvent): Promise<void> {
  const resource = event.resource;

  switch (event.event_type) {
    case "BILLING.SUBSCRIPTION.ACTIVATED": {
      const userId = resource.custom_id;
      if (!userId) break;

      const { planId, billingCycle } = await resolvePlanFromPayPalPlanId(resource.plan_id ?? "");

      const now = new Date();
      const periodEnd = new Date(now);
      if (billingCycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      await prisma.subscription.upsert({
        where: { paypalSubscriptionId: resource.id },
        create: {
          userId,
          planId,
          gateway: "paypal",
          status: "active",
          currency: "USD",
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          paypalSubscriptionId: resource.id,
          paypalPayerId: resource.payer?.payer_id,
        },
        update: {
          status: "active",
          paypalPayerId: resource.payer?.payer_id,
        },
      });
      const planRecord = await prisma.plan.findUnique({ where: { id: planId }, select: { name: true } });
      void sendSubscriptionConfirmation(userId, planRecord?.name ?? "Pro", billingCycle, periodEnd);
      break;
    }

    case "BILLING.SUBSCRIPTION.CANCELLED": {
      await prisma.subscription.updateMany({
        where: { paypalSubscriptionId: resource.id },
        data: { status: "cancelled", cancelledAt: new Date() },
      });
      break;
    }

    case "PAYMENT.SALE.COMPLETED": {
      const subId = (resource as unknown as { billing_agreement_id?: string })
        .billing_agreement_id;
      if (!subId) break;

      const subscription = await prisma.subscription.findFirst({
        where: { paypalSubscriptionId: subId },
      });
      if (!subscription) break;

      const amount = resource.amount;
      await prisma.payment.upsert({
        where: { gatewayPaymentId: resource.id },
        create: {
          userId: subscription.userId,
          subscriptionId: subscription.id,
          gateway: "paypal",
          gatewayPaymentId: resource.id,
          amount: amount ? parseFloat(amount.value) * 100 : 0,
          currency: amount?.currency_code ?? "USD",
          status: "succeeded",
          paymentMethod: "paypal",
        },
        update: { status: "succeeded" },
      });
      break;
    }
  }
}

async function resolvePlanFromPayPalPlanId(
  paypalPlanId: string
): Promise<{ planId: string; billingCycle: BillingCycle }> {
  const planIdMap = buildPayPalPlanIdToSlugMap();
  const match = planIdMap[paypalPlanId];

  if (match) {
    const plan = await prisma.plan.findFirst({ where: { slug: match.slug, isActive: true } });
    if (plan) return { planId: plan.id, billingCycle: match.cycle };
  }

  const fallback = await prisma.plan.findFirst({
    where: { isActive: true },
    orderBy: { priceMonthlyUSD: "asc" },
  });
  if (!fallback) throw new Error("No active plans found");
  return { planId: fallback.id, billingCycle: "monthly" };
}
