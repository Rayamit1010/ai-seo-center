import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("TechGeek@2026Admin", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@techgeekstudio.com" },
    update: {},
    create: {
      email: "admin@techgeekstudio.com",
      password: hashedPassword,
      name: "TGS Admin",
      company: "TechGeekStudio",
      website: "https://techgeekstudio.com",
      role: "admin",
    },
  });

  console.log("Seeded admin user:", user.email);

  // ── Billing Plans ────────────────────────────────────────────────────────────
  const soloFeatures = JSON.stringify([
    "3 Active Projects",
    "200 Keywords Tracked",
    "100 AI Calls/Day",
    "SEO Audit Tool",
    "Keyword Research",
    "Backlink Analysis",
    "Monthly Reports",
    "Email Support",
  ]);

  const agencyFeatures = JSON.stringify([
    "15 Active Projects",
    "1,000 Keywords Tracked",
    "500 AI Calls/Day",
    "Everything in Solo",
    "5 Team Members",
    "White-Label Reports",
    "Advanced Analytics",
    "Priority Support",
    "API Access",
  ]);

  const whiteLabelFeatures = JSON.stringify([
    "Unlimited Projects",
    "Unlimited Keywords",
    "Unlimited AI Calls",
    "Everything in Agency",
    "Unlimited Team Members",
    "White-Label Portal",
    "Custom Branding",
    "Dedicated Account Manager",
    "SLA Guarantee",
  ]);

  const solo = await prisma.plan.upsert({
    where: { slug: "solo" },
    update: {
      name: "Solo",
      priceMonthlyINR: 1499,
      priceMonthlyUSD: 18,
      priceYearlyINR: 14990,
      priceYearlyUSD: 180,
      features: soloFeatures,
      maxProjects: 3,
      maxKeywords: 200,
      maxAiCallsPerDay: 100,
      maxTeamMembers: 1,
      isActive: true,
    },
    create: {
      name: "Solo",
      slug: "solo",
      description: "Perfect for freelancers and individual SEO professionals",
      priceMonthlyINR: 1499,
      priceMonthlyUSD: 18,
      priceYearlyINR: 14990,
      priceYearlyUSD: 180,
      features: soloFeatures,
      maxProjects: 3,
      maxKeywords: 200,
      maxAiCallsPerDay: 100,
      maxTeamMembers: 1,
      isActive: true,
    },
  });

  const agency = await prisma.plan.upsert({
    where: { slug: "agency" },
    update: {
      name: "Agency",
      priceMonthlyINR: 3999,
      priceMonthlyUSD: 48,
      priceYearlyINR: 39990,
      priceYearlyUSD: 480,
      features: agencyFeatures,
      maxProjects: 15,
      maxKeywords: 1000,
      maxAiCallsPerDay: 500,
      maxTeamMembers: 5,
      isActive: true,
    },
    create: {
      name: "Agency",
      slug: "agency",
      description: "For growing agencies managing multiple client websites",
      priceMonthlyINR: 3999,
      priceMonthlyUSD: 48,
      priceYearlyINR: 39990,
      priceYearlyUSD: 480,
      features: agencyFeatures,
      maxProjects: 15,
      maxKeywords: 1000,
      maxAiCallsPerDay: 500,
      maxTeamMembers: 5,
      isActive: true,
    },
  });

  const whiteLabel = await prisma.plan.upsert({
    where: { slug: "white-label" },
    update: {
      name: "White-Label",
      priceMonthlyINR: 8999,
      priceMonthlyUSD: 108,
      priceYearlyINR: 89990,
      priceYearlyUSD: 1080,
      features: whiteLabelFeatures,
      maxProjects: -1,
      maxKeywords: -1,
      maxAiCallsPerDay: -1,
      maxTeamMembers: -1,
      isActive: true,
    },
    create: {
      name: "White-Label",
      slug: "white-label",
      description: "Full white-label solution for enterprise agencies",
      priceMonthlyINR: 8999,
      priceMonthlyUSD: 108,
      priceYearlyINR: 89990,
      priceYearlyUSD: 1080,
      features: whiteLabelFeatures,
      maxProjects: -1,
      maxKeywords: -1,
      maxAiCallsPerDay: -1,
      maxTeamMembers: -1,
      isActive: true,
    },
  });

  console.log("Seeded plans:", solo.slug, agency.slug, whiteLabel.slug);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
