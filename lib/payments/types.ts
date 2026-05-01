export type PaymentGateway = "stripe" | "razorpay" | "paypal";

export type PlanSlug = "solo" | "agency" | "white-label";

export type BillingCycle = "monthly" | "yearly";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "trialing"
  | "incomplete"
  | "paused";

export type PaymentCurrency = "INR" | "USD" | "EUR";

export interface PlanDefinition {
  slug: PlanSlug;
  name: string;
  description: string;
  priceMonthlyINR: number;
  priceMonthlyUSD: number;
  priceYearlyINR: number;
  priceYearlyUSD: number;
  features: string[];
  maxProjects: number;
  maxKeywords: number;
  maxAiCallsPerDay: number;
  maxTeamMembers: number;
  isPopular?: boolean;
}

export interface CheckoutSession {
  gateway: PaymentGateway;
  sessionId?: string;
  url?: string;
  // Razorpay-specific
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  userName?: string;
  userEmail?: string;
  planName?: string;
  // PayPal-specific
  subscriptionId?: string;
  approvalUrl?: string;
}

export interface GatewayCustomer {
  id: string;
  email: string;
  name?: string;
}

export interface SubscriptionCreateResult {
  subscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  customerId?: string;
}

export interface PaymentRecord {
  id: string;
  gateway: PaymentGateway;
  gatewayPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  createdAt: Date;
  receiptUrl?: string;
}

export interface SubscriptionWithPlan {
  id: string;
  userId: string;
  planId: string;
  gateway: PaymentGateway;
  status: SubscriptionStatus;
  currency: string;
  billingCycle: BillingCycle;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date | null;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  razorpaySubscriptionId?: string | null;
  paypalSubscriptionId?: string | null;
  plan: {
    id: string;
    name: string;
    slug: string;
    priceMonthlyINR: number;
    priceMonthlyUSD: number;
    priceYearlyINR: number;
    priceYearlyUSD: number;
    features: string;
    maxProjects: number;
    maxKeywords: number;
    maxAiCallsPerDay: number;
    maxTeamMembers: number;
  };
}

export interface UsageStats {
  aiCallsToday: number;
  aiCallsLimit: number;
  projectsCount: number;
  projectsLimit: number;
  keywordsCount: number;
  keywordsLimit: number;
  teamMembersCount: number;
  teamMembersLimit: number;
}

export interface FeatureLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  feature: string;
}

export class PaymentRequiredError extends Error {
  constructor(message = "Active subscription required") {
    super(message);
    this.name = "PaymentRequiredError";
  }
}

export class QuotaExceededError extends Error {
  readonly feature: string;
  readonly current: number;
  readonly limit: number;

  constructor(feature: string, current: number, limit: number) {
    super(`Quota exceeded for ${feature}: ${current}/${limit}`);
    this.name = "QuotaExceededError";
    this.feature = feature;
    this.current = current;
    this.limit = limit;
  }
}

export function isPaymentRequiredError(e: unknown): e is PaymentRequiredError {
  return e instanceof PaymentRequiredError;
}

export function isQuotaExceededError(e: unknown): e is QuotaExceededError {
  return e instanceof QuotaExceededError;
}
