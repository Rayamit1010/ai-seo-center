import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const addSchema = z.object({
  domain: z.string().min(1).max(255).transform((v) => v.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase()),
  name: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  projectId: z.string().optional(),
});

export async function GET() {
  try {
    const userId = await getRequiredUserId();
    const competitors = await prisma.competitorTracking.findMany({
      where: { userId },
      orderBy: { trackedSince: "desc" },
    });
    return ok(competitors);
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to fetch competitors");
  }
}

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const body = await req.json();
    const data = addSchema.parse(body);

    const existing = await prisma.competitorTracking.findUnique({
      where: { userId_domain: { userId, domain: data.domain } },
    });
    if (existing) return fail("Competitor already tracked", 409);

    const competitor = await prisma.competitorTracking.create({
      data: {
        userId,
        domain: data.domain,
        name: data.name,
        notes: data.notes,
        projectId: data.projectId,
      },
    });
    return ok(competitor, { status: 201 });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    return fail("Failed to add competitor");
  }
}
