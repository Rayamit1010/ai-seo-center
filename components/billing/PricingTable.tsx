"use client";

import { useState } from "react";
import { CheckoutButton } from "./CheckoutButton";
import { PLANS, getYearlySavingsPercent } from "@/lib/payments/plans";
import type { BillingCycle } from "@/lib/payments/types";

interface PricingTableProps {
  showCheckoutButtons?: boolean;
  currentPlanSlug?: string;
}

const PAYMENT_METHOD_BADGES: Record<string, string[]> = {
  INR: ["UPI", "Cards", "Net Banking", "Wallets", "EMI"],
  USD: ["Cards", "Apple Pay", "Google Pay", "PayPal"],
};

export function PricingTable({ showCheckoutButtons = true, currentPlanSlug }: PricingTableProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");

  const savingsPercent = getYearlySavingsPercent(PLANS[0]);

  return (
    <div className="flex flex-col gap-8">
      {/* Toggles */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {/* Billing cycle toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              billingCycle === "monthly"
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              billingCycle === "yearly"
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Yearly
            <span className="rounded-full bg-green-500/20 px-1.5 py-0.5 text-xs font-semibold text-green-600">
              -{savingsPercent}%
            </span>
          </button>
        </div>

        {/* Currency toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          <button
            onClick={() => setCurrency("INR")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              currency === "INR"
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            🇮🇳 INR
          </button>
          <button
            onClick={() => setCurrency("USD")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              currency === "USD"
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            🌍 USD
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const price =
            currency === "INR"
              ? billingCycle === "monthly"
                ? plan.priceMonthlyINR
                : Math.round(plan.priceYearlyINR / 12)
              : billingCycle === "monthly"
                ? plan.priceMonthlyUSD
                : Math.round(plan.priceYearlyUSD / 12);

          const priceDisplay =
            currency === "INR"
              ? `₹${price.toLocaleString("en-IN")}`
              : `$${price}`;

          const yearlyTotal =
            currency === "INR"
              ? `₹${plan.priceYearlyINR.toLocaleString("en-IN")}/yr`
              : `$${plan.priceYearlyUSD}/yr`;

          const isCurrentPlan = currentPlanSlug === plan.slug;
          const features: string[] = plan.features;

          return (
            <div
              key={plan.slug}
              className={`relative flex flex-col rounded-xl border p-6 ${
                plan.isPopular
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-border bg-surface"
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="mt-1 text-sm text-text-secondary">{plan.description}</p>

                <div className="mt-4">
                  <div className="flex items-end gap-1">
                    <span className="font-mono text-3xl font-bold">{priceDisplay}</span>
                    <span className="mb-1 text-text-secondary">/mo</span>
                  </div>
                  {billingCycle === "yearly" && (
                    <p className="text-sm text-text-secondary">
                      Billed as {yearlyTotal}
                    </p>
                  )}
                </div>
              </div>

              <ul className="mb-6 flex flex-1 flex-col gap-2">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-green-500">✓</span>
                    <span className="text-text-secondary">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Payment method badges */}
              <div className="mb-4 flex flex-wrap gap-1">
                {PAYMENT_METHOD_BADGES[currency].map((method) => (
                  <span
                    key={method}
                    className="rounded border border-border bg-background px-1.5 py-0.5 text-xs text-text-secondary"
                  >
                    {method}
                  </span>
                ))}
              </div>

              {showCheckoutButtons && (
                isCurrentPlan ? (
                  <div className="rounded-lg border border-green-500/20 bg-green-500/10 py-2 text-center text-sm font-medium text-green-600">
                    Current Plan
                  </div>
                ) : (
                  <CheckoutButton
                    planSlug={plan.slug}
                    billingCycle={billingCycle}
                    currency={currency}
                    planName={plan.name}
                    label={`Get ${plan.name}`}
                    className={plan.isPopular ? "" : "bg-surface border border-border text-text-primary hover:bg-background"}
                  />
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
