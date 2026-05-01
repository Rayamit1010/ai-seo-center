import type { PlanDefinition } from "./types";

export const PLANS: PlanDefinition[] = [
  {
    slug: "solo",
    name: "Solo",
    description: "Perfect for freelancers and individual SEO professionals",
    priceMonthlyINR: 1499,
    priceMonthlyUSD: 18,
    priceYearlyINR: 14990,
    priceYearlyUSD: 180,
    features: [
      "3 Active Projects",
      "200 Keywords Tracked",
      "100 AI Calls/Day",
      "SEO Audit Tool",
      "Keyword Research",
      "Backlink Analysis",
      "Monthly Reports",
      "Email Support",
    ],
    maxProjects: 3,
    maxKeywords: 200,
    maxAiCallsPerDay: 100,
    maxTeamMembers: 1,
  },
  {
    slug: "agency",
    name: "Agency",
    description: "For growing agencies managing multiple client websites",
    priceMonthlyINR: 3999,
    priceMonthlyUSD: 48,
    priceYearlyINR: 39990,
    priceYearlyUSD: 480,
    features: [
      "15 Active Projects",
      "1,000 Keywords Tracked",
      "500 AI Calls/Day",
      "Everything in Solo",
      "5 Team Members",
      "White-Label Reports",
      "Advanced Analytics",
      "Priority Support",
      "API Access",
    ],
    maxProjects: 15,
    maxKeywords: 1000,
    maxAiCallsPerDay: 500,
    maxTeamMembers: 5,
    isPopular: true,
  },
  {
    slug: "white-label",
    name: "White-Label",
    description: "Full white-label solution for enterprise agencies",
    priceMonthlyINR: 8999,
    priceMonthlyUSD: 108,
    priceYearlyINR: 89990,
    priceYearlyUSD: 1080,
    features: [
      "Unlimited Projects",
      "Unlimited Keywords",
      "Unlimited AI Calls",
      "Everything in Agency",
      "Unlimited Team Members",
      "White-Label Portal",
      "Custom Branding",
      "Dedicated Account Manager",
      "SLA Guarantee",
    ],
    maxProjects: -1,
    maxKeywords: -1,
    maxAiCallsPerDay: -1,
    maxTeamMembers: -1,
  },
];

export function getPlanBySlug(slug: string): PlanDefinition | undefined {
  return PLANS.find((p) => p.slug === slug);
}

export function getYearlySavingsPercent(plan: PlanDefinition): number {
  const monthlyTotal = plan.priceMonthlyINR * 12;
  const savings = monthlyTotal - plan.priceYearlyINR;
  return Math.round((savings / monthlyTotal) * 100);
}
