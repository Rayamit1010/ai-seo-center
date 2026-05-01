"use client";

import { useSubscription } from "@/hooks/useSubscription";
import { CurrentPlanCard } from "@/components/billing/CurrentPlanCard";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { PaymentHistory } from "@/components/billing/PaymentHistory";
import { PricingTable } from "@/components/billing/PricingTable";
import Link from "next/link";

export default function BillingPage() {
  const { data, loading, error, refresh } = useSubscription();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-red-500">
        {error}
      </div>
    );
  }

  const { subscription, usage, payments, hasSubscription } = data!;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Billing &amp; Subscription</h1>
        <p className="mt-1 text-text-secondary">
          Manage your plan, usage, and payment history.
        </p>
      </div>

      {hasSubscription && subscription ? (
        <>
          {/* Current Plan */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Current Plan</h2>
            <CurrentPlanCard
              subscription={{
                ...subscription,
                currentPeriodEnd: subscription.currentPeriodEnd,
              }}
              onCancelled={refresh}
            />
          </section>

          {/* Usage */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Usage This Period</h2>
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <UsageMeter
                  label="Active Projects"
                  current={usage.projectsCount}
                  limit={usage.projectsLimit}
                />
                <UsageMeter
                  label="Keywords Tracked"
                  current={usage.keywordsCount}
                  limit={usage.keywordsLimit}
                />
                <UsageMeter
                  label="AI Calls / Day"
                  current={0}
                  limit={usage.aiCallsLimit}
                />
                <UsageMeter
                  label="Team Members"
                  current={usage.teamMembersCount}
                  limit={usage.teamMembersLimit}
                />
              </div>
              {(usage.projectsLimit === -1 || usage.aiCallsLimit === -1) && (
                <p className="mt-4 text-sm text-text-secondary">
                  ∞ = Unlimited on your plan
                </p>
              )}
            </div>
          </section>

          {/* Payment History */}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Payment History</h2>
            <PaymentHistory payments={payments} />
          </section>

          {/* Upgrade options if not on white-label */}
          {subscription.plan.slug !== "white-label" && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Upgrade Your Plan</h2>
              <PricingTable
                showCheckoutButtons
                currentPlanSlug={subscription.plan.slug}
              />
            </section>
          )}
        </>
      ) : (
        <>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
            <h2 className="font-semibold text-amber-600">No active subscription</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Choose a plan below to unlock all features.
            </p>
          </div>

          <PricingTable showCheckoutButtons />

          <p className="text-center text-sm text-text-secondary">
            Need help choosing?{" "}
            <Link href="/chat" className="text-primary hover:underline">
              Ask our AI assistant
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
