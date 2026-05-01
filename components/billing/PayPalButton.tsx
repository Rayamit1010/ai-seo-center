"use client";

import { useState } from "react";

interface PayPalButtonProps {
  planSlug: string;
  billingCycle: string;
  onSuccess?: (subscriptionId: string, approvalUrl: string) => void;
  onError?: (message: string) => void;
}

export function PayPalButton({
  planSlug,
  billingCycle,
  onSuccess,
  onError,
}: PayPalButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handlePayPalCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout/paypal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug, billingCycle }),
      });
      const json = (await res.json()) as {
        data?: { subscriptionId: string; approvalUrl: string };
        error?: string;
      };

      if (!res.ok || !json.data) {
        onError?.(json.error ?? "Failed to create PayPal subscription");
        return;
      }

      onSuccess?.(json.data.subscriptionId, json.data.approvalUrl);
      window.location.href = json.data.approvalUrl;
    } catch {
      onError?.("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePayPalCheckout}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0070BA] px-4 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : (
        <>
          <span className="text-lg">🅿️</span>
          Pay with PayPal
        </>
      )}
    </button>
  );
}
