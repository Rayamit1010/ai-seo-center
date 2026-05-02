import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const body = await req.json();
    const { token } = z.object({ token: z.string().min(1) }).parse(body);

    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: { team: true },
    });

    if (!invite) return fail("Invalid or expired invitation", 404);
    if (invite.acceptedAt) return fail("This invitation has already been accepted", 400);
    if (invite.expiresAt < new Date()) return fail("This invitation has expired", 400);

    const session = await getServerSession(authOptions);
    const userEmail = (session?.user as { email?: string })?.email;
    if (invite.email !== userEmail) {
      return fail("This invitation was sent to a different email address", 403);
    }

    const existing = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: invite.teamId, userId } } });
    if (existing) return fail("You are already a member of this team", 400);

    await prisma.$transaction([
      prisma.teamMember.create({ data: { teamId: invite.teamId, userId, role: invite.role } }),
      prisma.teamInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
    ]);

    return ok({ teamId: invite.teamId, teamName: invite.team.name, role: invite.role });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    return fail("Failed to accept invite");
  }
}
