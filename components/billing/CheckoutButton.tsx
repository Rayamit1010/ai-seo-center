"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RazorpayCheckout } from "./RazorpayCheckout";

interface CheckoutButtonProps {
  planSlug: string;
  billingCycle: "monthly" | "yearly";
  currency: "INR" | "USD";
  planName: string;
  className?: string;
  label?: string;
}

interface RazorpayOrderData {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  userName: string;
  userEmail: string;
  planName: string;
}

export function CheckoutButton({
  planSlug,
  billingCycle,
  currency,
  planName,
  className = "",
  label = "Get Started",
}: CheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razorpayData, setRazorpayData] = useState<RazorpayOrderData | null>(null);

  const defaultClass =
    "w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";

  async function handleClick() {
    setLoading(true);
    setError(null);

    if (currency === "INR") {
      try {
        const res = await fetch("/api/billing/checkout/razorpay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planSlug, billingCycle, currency }),
        });
        const json = (await res.json()) as { data?: RazorpayOrderData; error?: string };
        if (!res.ok || !json.data) {
          setError(json.error ?? "Failed to initiate payment");
          setLoading(false);
          return;
        }
        setRazorpayData(json.data);
        setLoading(false);
        return;
      } catch {
        setError("Network error. Please try again.");
        setLoading(false);
        return;
      }
    }

    // Stripe for USD
    try {
      const res = await fetch("/api/billing/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug, billingCycle }),
      });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok || !json.data?.url) {
        setError(json.error ?? "Failed to initiate checkout");
        setLoading(false);
        return;
      }
      window.location.href = json.data.url;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (razorpayData) {
    return (
      <div className="flex flex-col gap-1">
        <RazorpayCheckout
          orderId={razorpayData.orderId}
          amount={razorpayData.amount}
          currency={razorpayData.currency}
          keyId={razorpayData.keyId}
          userName={razorpayData.userName}
          userEmail={razorpayData.userEmail}
          planName={planName}
          planSlug={planSlug}
          billingCycle={billingCycle}
          onSuccess={() => {
            setRazorpayData(null);
            router.refresh();
          }}
          onError={(msg) => {
            setError(msg);
            setRazorpayData(null);
          }}
          onDismiss={() => setRazorpayData(null)}
        >
          <span className={`${defaultClass} ${className} flex items-center justify-center gap-2`}>
            <span>🇮🇳</span> Pay with UPI / Card
          </span>
        </RazorpayCheckout>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`${defaultClass} ${className} flex items-center justify-center gap-2`}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          label
        )}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
