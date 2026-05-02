"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "Which payment methods are supported?",
    answer:
      "India: UPI (all apps), Credit/Debit Cards (Visa/Mastercard/RuPay), Net Banking, Wallets (Paytm, PhonePe, Mobikwik), EMI. International: Visa, Mastercard, AmEx, Apple Pay, Google Pay, PayPal.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "You can cancel within 7 days for a full refund. No questions asked.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes — cancel from your billing dashboard. Access continues until the end of your billing period.",
  },
  {
    question: "What is White-Label?",
    answer:
      "Full white-label: your logo, custom domain, client portal. Resell under your own brand.",
  },
  {
    question: "Is my payment data secure?",
    answer:
      "Payments via Stripe (international) or Razorpay (India) — both PCI-DSS Level 1 certified. We never store card numbers.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  return (
    <div className="mx-auto max-w-3xl divide-y divide-border">
      {FAQ_ITEMS.map((item, index) => (
        <div key={index} className="py-5">
          <button
            onClick={() => toggle(index)}
            className="flex w-full items-center justify-between gap-4 text-left"
            aria-expanded={openIndex === index}
          >
            <span className="text-base font-medium text-text-primary">
              {item.question}
            </span>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-text-secondary transition-transform duration-200 ${
                openIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>
          {openIndex === index && (
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {item.answer}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
