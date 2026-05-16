import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/server/response";

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthlyINR: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        priceMonthlyINR: true,
        priceMonthlyUSD: true,
        priceYearlyINR: true,
        priceYearlyUSD: true,
        features: true,
      },
    });

    return ok(plans);
  } catch (error) {
    console.error("Plans fetch error:", error);
    return fail("Failed to fetch plans");
  }
}
