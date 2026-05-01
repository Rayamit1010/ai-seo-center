"use client";

import { useState } from "react";
import { BillingPortalButton } from "./BillingPortalButton";

interface Plan {
  name: string;
  slug: string;
  priceMonthlyINR: number;
  priceMonthlyUSD: number;
  priceYearlyINR: number;
  priceYearlyUSD: number;
  features: string;
}

interface Subscription {
  id: string;
  gateway: string;
  status: string;
  currency: string;
  billingCycle: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: Plan;
}

interface CurrentPlanCardProps {
  subscription: Subscription;
  onCancelled?: () => void;
}

function formatPrice(amount: number, currency: string): string {
  if (currency === "INR") return `₹${amount.toLocaleString("en-IN")}/mo`;
  return `$${amount}/mo`;
}

export function CurrentPlanCard({ subscription, onCancelled }: CurrentPlanCardProps) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const plan = subscription.plan;
  const renewalDate = new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const price =
    subscription.currency === "INR"
      ? subscription.billingCycle === "yearly"
        ? formatPrice(Math.round(plan.priceYearlyINR / 12), "INR")
        : formatPrice(plan.priceMonthlyINR, "INR")
      : subscription.billingCycle === "yearly"
        ? formatPrice(Math.round(plan.priceYearlyUSD / 12), "USD")
        : formatPrice(plan.priceMonthlyUSD, "USD");

  async function handleCancel() {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subscription.id }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setCancelError(json.error ?? "Failed to cancel subscription");
        return;
      }
      setShowConfirm(false);
      onCancelled?.();
    } catch {
      setCancelError("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  const statusBadge = (() => {
    const variants: Record<string, string> = {
      active: "bg-green-500/10 text-green-500",
      trialing: "bg-blue-500/10 text-blue-500",
      past_due: "bg-red-500/10 text-red-500",
      cancelled: "bg-border text-text-secondary",
    };
    return variants[subscription.status] ?? "bg-border text-text-secondary";
  })();

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{plan.name} Plan</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge}`}>
              {subscription.status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-1 font-mono text-2xl font-bold text-primary">{price}</p>
          <p className="mt-1 text-sm text-text-secondary capitalize">
            {subscription.billingCycle} billing · via {subscription.gateway}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {subscription.gateway === "stripe" && <BillingPortalButton />}
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-background p-3 text-sm">
        {subscription.cancelAtPeriodEnd ? (
          <p className="text-amber-500">
            Subscription ends on {renewalDate}. You&apos;ll lose access after this date.
          </p>
        ) : (
          <p className="text-text-secondary">
            Renews on <span className="font-medium text-text-primary">{renewalDate}</span>
          </p>
        )}
      </div>

      {!subscription.cancelAtPeriodEnd && subscription.status === "active" && (
        <div className="mt-4">
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-sm text-text-secondary underline-offset-2 hover:text-red-500 hover:underline"
            >
              Cancel subscription
            </button>
          ) : (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-sm text-text-primary">
                Are you sure? You&apos;ll keep access until {renewalDate}.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="rounded-md bg-red-500 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  {cancelling ? "Cancelling…" : "Yes, cancel"}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="rounded-md border border-border px-3 py-1 text-xs"
                >
                  Keep subscription
                </button>
              </div>
              {cancelError && <p className="mt-1 text-xs text-red-500">{cancelError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
