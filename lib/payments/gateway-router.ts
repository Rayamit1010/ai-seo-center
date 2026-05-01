import type { PaymentGateway, PaymentCurrency } from "./types";

export function selectGateway(
  userCurrency: PaymentCurrency,
  userCountry?: string
): PaymentGateway {
  if (userCurrency === "INR") return "razorpay";
  if (userCurrency === "USD" && userCountry === "US") return "stripe";
  return "stripe";
}

export function getGatewayDisplayName(gateway: PaymentGateway): string {
  const names: Record<PaymentGateway, string> = {
    stripe: "💳 Stripe",
    razorpay: "🇮🇳 Razorpay",
    paypal: "🅿️ PayPal",
  };
  return names[gateway];
}

export function getSupportedPaymentMethods(gateway: PaymentGateway): string[] {
  const methods: Record<PaymentGateway, string[]> = {
    razorpay: ["UPI", "Credit Card", "Debit Card", "Net Banking", "Wallets", "EMI"],
    stripe: ["Credit Card", "Debit Card", "Apple Pay", "Google Pay"],
    paypal: ["PayPal Balance", "Credit Card", "Debit Card"],
  };
  return methods[gateway];
}

export function getGatewayIcon(gateway: PaymentGateway): string {
  const icons: Record<PaymentGateway, string> = {
    stripe: "💳",
    razorpay: "🇮🇳",
    paypal: "🅿️",
  };
  return icons[gateway];
}

export function detectCurrencyFromLocale(): PaymentCurrency {
  if (typeof window === "undefined") return "USD";
  const locale = navigator.language ?? "en-US";
  if (locale.includes("IN") || locale === "hi") return "INR";
  return "USD";
}
