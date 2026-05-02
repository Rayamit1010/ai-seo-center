import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    assertTrustedOrigin(_req);
    const userId = await getRequiredUserId();
    const { memberId } = await params;

    const member = await prisma.teamMember.findUnique({ where: { id: memberId }, include: { team: true } });
    if (!member) return fail("Member not found", 404);
    if (member.team.ownerId !== userId) return fail("Only the team owner can remove members", 403);
    if (member.userId === userId) return fail("Cannot remove yourself from the team", 400);

    await prisma.teamMember.delete({ where: { id: memberId } });
    return ok({ removed: true });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to remove member");
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const { memberId } = await params;

    const body = await req.json();
    const { role } = z.object({ role: z.enum(["viewer", "admin"]) }).parse(body);

    const member = await prisma.teamMember.findUnique({ where: { id: memberId }, include: { team: true } });
    if (!member) return fail("Member not found", 404);
    if (member.team.ownerId !== userId) return fail("Only the team owner can change roles", 403);

    const updated = await prisma.teamMember.update({ where: { id: memberId }, data: { role } });
    return ok(updated);
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    return fail("Failed to update role");
  }
}
