import { PricingTable } from "@/components/billing/PricingTable";
import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: "Pricing — TechGeekStudio SEO Center",
  description:
    "Simple, transparent pricing for SEO professionals. Start free, upgrade as you grow.",
};

const FAQS = [
  {
    q: "Can I change my plan later?",
    a: "Yes, you can upgrade or downgrade at any time. Changes take effect at your next billing cycle.",
  },
  {
    q: "What payment methods are accepted?",
    a: "India: UPI (all apps), Credit/Debit Cards, Net Banking, Wallets (Paytm, PhonePe), EMI. International: Visa, Mastercard, American Express, Apple Pay, Google Pay, PayPal.",
  },
  {
    q: "Is there a free trial?",
    a: "We don't offer a free trial, but you can cancel at any time before the next billing date for a pro-rated refund within 7 days.",
  },
  {
    q: "What is the White-Label plan?",
    a: "White-Label lets you resell the platform under your own brand. You get a custom domain, your logo, and a dedicated portal for your clients.",
  },
  {
    q: "Is my payment information secure?",
    a: "All payments are processed by Stripe (international) or Razorpay (India) — both PCI-DSS Level 1 certified. We never store card details.",
  },
];

const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Pricing — TechGeekStudio SEO Center",
  description: "Simple, transparent pricing for SEO professionals. Solo, Agency, and White-Label plans available.",
  mainEntity: {
    "@type": "ItemList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Solo Plan" },
      { "@type": "ListItem", position: 2, name: "Agency Plan" },
      { "@type": "ListItem", position: 3, name: "White-Label Plan" },
    ],
  },
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <Script
        id="ld-pricing"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026") }}
      />
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Simple, transparent pricing
        </h1>
        <p className="mt-3 text-lg text-text-secondary">
          Power your SEO workflow with AI. No surprises, cancel anytime.
        </p>
      </div>

      <PricingTable showCheckoutButtons />

      {/* Trusted badges */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="text-green-500">🔒</span> SSL Encrypted
        </span>
        <span className="flex items-center gap-1.5">
          <span>💳</span> Stripe &amp; Razorpay
        </span>
        <span className="flex items-center gap-1.5">
          <span>🇮🇳</span> UPI / Net Banking
        </span>
        <span className="flex items-center gap-1.5">
          <span>✓</span> Cancel anytime
        </span>
        <span className="flex items-center gap-1.5">
          <span>🧾</span> GST invoice on request
        </span>
      </div>

      {/* FAQ */}
      <div className="mt-16">
        <h2 className="mb-6 text-center text-2xl font-bold">Frequently Asked Questions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {FAQS.map((faq) => (
            <div
              key={faq.q}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <h3 className="font-semibold">{faq.q}</h3>
              <p className="mt-1.5 text-sm text-text-secondary">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-16 text-center">
        <p className="text-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>{" "}
          to manage your subscription.
        </p>
      </div>
    </div>
  );
}
