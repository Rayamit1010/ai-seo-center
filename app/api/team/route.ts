import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getRequiredUserId();

    const ownedTeam = await prisma.team.findFirst({
      where: { ownerId: userId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        invites: { where: { acceptedAt: null, expiresAt: { gt: new Date() } } },
      },
    });

    if (ownedTeam) return ok({ team: ownedTeam, role: "owner" });

    const membership = await prisma.teamMember.findFirst({
      where: { userId },
      include: {
        team: {
          include: {
            members: { include: { user: { select: { id: true, name: true, email: true } } } },
            invites: { where: { acceptedAt: null, expiresAt: { gt: new Date() } } },
          },
        },
      },
    });

    if (membership) return ok({ team: membership.team, role: membership.role });

    return ok(null);
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to fetch team");
  }
}

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const body = await req.json();
    const { name } = z.object({ name: z.string().min(1).max(100) }).parse(body);

    const existing = await prisma.team.findFirst({ where: { ownerId: userId } });
    if (existing) return fail("You already own a team", 400);

    const team = await prisma.team.create({
      data: {
        name,
        ownerId: userId,
        members: { create: { userId, role: "admin" } },
      },
      include: { members: true },
    });

    return ok(team);
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    return fail("Failed to create team");
  }
}
