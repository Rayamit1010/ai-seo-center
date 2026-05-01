"use client";

import { useEffect, useRef, useState } from "react";

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayCheckoutProps {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  userName: string;
  userEmail: string;
  planName: string;
  planSlug: string;
  billingCycle: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
  onDismiss?: () => void;
  children?: React.ReactNode;
}

export function RazorpayCheckout({
  orderId,
  amount,
  currency,
  keyId,
  userName,
  userEmail,
  planName,
  planSlug,
  billingCycle,
  onSuccess,
  onError,
  onDismiss,
  children,
}: RazorpayCheckoutProps) {
  const [sdkReady, setSdkReady] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const sdkLoaded = useRef(false);

  useEffect(() => {
    if (sdkLoaded.current || window.Razorpay) {
      setSdkReady(true);
      return;
    }
    sdkLoaded.current = true;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setSdkReady(true);
    script.onerror = () => onError?.("Failed to load payment SDK");
    document.body.appendChild(script);
  }, [onError]);

  async function handlePayment() {
    if (!window.Razorpay) {
      onError?.("Payment SDK not loaded. Please refresh the page.");
      return;
    }

    const options: RazorpayOptions = {
      key: keyId,
      amount,
      currency,
      order_id: orderId,
      name: "TechGeekStudio",
      description: `${planName} Plan — ${billingCycle}`,
      prefill: { name: userName, email: userEmail },
      theme: { color: "#6366F1" },
      handler: async (response) => {
        setVerifying(true);
        try {
          const res = await fetch("/api/billing/verify/razorpay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planSlug,
              billingCycle,
              currency,
            }),
          });
          const json = (await res.json()) as { error?: string };
          if (!res.ok) {
            onError?.(json.error ?? "Payment verification failed");
            return;
          }
          onSuccess?.();
        } catch {
          onError?.("Network error during payment verification");
        } finally {
          setVerifying(false);
        }
      },
      modal: {
        ondismiss: () => onDismiss?.(),
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  }

  if (verifying) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Verifying payment…
      </div>
    );
  }

  if (!sdkReady) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
        Loading payment SDK…
      </div>
    );
  }

  return (
    <button onClick={handlePayment} className="w-full">
      {children}
    </button>
  );
}
