import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import {
  Zap,
  Bot,
  TrendingUp,
  FileText,
  Link as LinkIcon,
  BarChart3,
  Cpu,
  Check,
} from "lucide-react";
import { PricingTable } from "@/components/billing/PricingTable";
import { FAQSection } from "@/components/landing/FAQSection";

export const metadata: Metadata = {
  title: "TechGeekStudio SEO Center — AI-Powered SEO Operations Platform",
  description:
    "Keyword research, rank tracking, content briefs, backlink automation and client reporting powered by Claude, ChatGPT, Gemini and Grok.",
  keywords: [
    "SEO tool",
    "AI SEO",
    "rank tracker",
    "content brief generator",
    "backlink automation",
    "SEO agency tool",
    "India SEO tool",
    "UPI payment",
  ],
};

const FEATURES = [
  {
    icon: Bot,
    title: "AI SEO Copilot",
    description:
      "Claude, GPT-4, Gemini, Grok — automatic failover keeps you running",
  },
  {
    icon: TrendingUp,
    title: "Rank Tracker",
    description:
      "Daily position monitoring for unlimited keywords across all countries",
  },
  {
    icon: FileText,
    title: "Content Brief Generator",
    description:
      "AI-powered outlines with LSI keywords and competitor analysis",
  },
  {
    icon: LinkIcon,
    title: "Backlink Outreach",
    description:
      "Automated prospect discovery, qualification, and email sequences",
  },
  {
    icon: BarChart3,
    title: "Client Reports",
    description:
      "Scheduled branded PDF reports delivered to clients automatically",
  },
  {
    icon: Cpu,
    title: "Project Memory",
    description:
      "Per-site brand voice, playbook, and strategy context for the AI",
  },
];

const WHY_FEATURES = [
  "5 AI Providers, automatic failover",
  "Built for Indian agencies (UPI, Razorpay)",
  "White-hat automation only",
  "Unlimited team members on White-Label",
  "Daily rank monitoring included",
  "White-label portal for clients",
];

const PAYMENT_METHODS = [
  "UPI",
  "Visa",
  "Mastercard",
  "RuPay",
  "Net Banking",
  "PayPal",
  "Apple Pay",
  "Google Pay",
];

const APP_URL = process.env.NEXTAUTH_URL ?? "https://seoagent.techgeekstudio.com";

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TechGeekStudio SEO Command Center",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: APP_URL,
  description: "AI-powered SEO audit, keyword research, backlink strategy, rank tracking and content optimization platform.",
  offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: "0", offerCount: "3" },
  author: { "@type": "Organization", name: "TechGeekStudio", url: "https://techgeekstudio.com" },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <Script
        id="ld-software"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026") }}
      />
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-heading text-lg font-bold text-text-primary">
              TechGeekStudio SEO Center
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#features"
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden py-24 text-center"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)",
        }}
      >
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Zap className="h-3.5 w-3.5" />
            AI-Powered SEO Operations
          </div>

          <h1 className="font-heading mt-6 text-4xl font-extrabold leading-tight tracking-tight text-text-primary md:text-5xl lg:text-6xl">
            The AI SEO Operations Platform
            <br />
            <span className="text-primary">for Modern Agencies</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary">
            Keyword research, rank tracking, content briefs, backlink
            automation, and client reporting — all in one AI-powered hub.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/40"
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-border bg-surface px-8 py-3.5 text-base font-semibold text-text-primary transition-colors hover:bg-surface-hover"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Feature Grid ── */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h2 className="font-heading text-3xl font-bold text-text-primary md:text-4xl">
              Everything you need to dominate SEO
            </h2>
            <p className="mt-3 text-text-secondary">
              One platform, six powerful modules — built for agencies that
              move fast.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-primary/40 hover:bg-surface-hover"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold text-text-primary">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why TechGeekStudio ── */}
      <section className="border-y border-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h2 className="font-heading text-3xl font-bold text-text-primary md:text-4xl">
              Why TechGeekStudio?
            </h2>
            <p className="mt-3 text-text-secondary">
              Built with agencies in mind — especially those based in India.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_FEATURES.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 rounded-xl border border-border bg-background p-5"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-500">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-medium text-text-primary">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h2 className="font-heading text-3xl font-bold text-text-primary md:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-text-secondary">
              No hidden fees. Cancel anytime. 7-day money-back guarantee.
            </p>
          </div>
          <PricingTable showCheckoutButtons={true} />
        </div>
      </section>

      {/* ── Payment Methods Strip ── */}
      <section className="border-y border-border bg-surface py-12">
        <div className="mx-auto max-w-7xl px-6">
          <p className="mb-6 text-center text-sm font-medium text-text-secondary">
            Accepted payment methods
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {PAYMENT_METHODS.map((method) => (
              <span
                key={method}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-text-secondary"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h2 className="font-heading text-3xl font-bold text-text-primary md:text-4xl">
              Frequently asked questions
            </h2>
          </div>
          <FAQSection />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-surface py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-10 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="font-heading font-bold text-text-primary">
                  TechGeekStudio
                </span>
              </Link>
              <p className="mt-3 text-sm text-text-secondary">
                AI-powered SEO operations for modern agencies.
              </p>
            </div>

            {/* Company */}
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Company
              </p>
              <ul className="space-y-2.5">
                {["About", "Pricing", "Contact"].map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Product */}
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Product
              </p>
              <ul className="space-y-2.5">
                {["Features", "API Docs"].map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Legal
              </p>
              <ul className="space-y-2.5">
                {["Privacy", "Terms"].map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border pt-8 text-center">
            <p className="text-sm text-text-muted">
              &copy; 2024 TechGeekStudio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
