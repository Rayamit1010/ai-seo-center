import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { ok, fail } from "@/lib/server/response";
import { prisma } from "@/lib/db";
import { getResendClient } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    const body = await req.json();
    const { email, role } = z.object({
      email: z.string().email(),
      role: z.enum(["viewer", "admin"]).default("viewer"),
    }).parse(body);

    const team = await prisma.team.findFirst({ where: { ownerId: userId } });
    if (!team) {
      const membership = await prisma.teamMember.findFirst({ where: { userId, role: "admin" } });
      if (!membership) return fail("Only team owners or admins can invite members", 403);
    }

    const teamId = team?.id ?? (await prisma.teamMember.findFirst({ where: { userId, role: "admin" } }))!.teamId;

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await prisma.teamInvite.create({ data: { teamId, email, role, expiresAt } });

    const appUrl = process.env.NEXTAUTH_URL ?? "https://seoagent.techgeekstudio.com";
    const resend = getResendClient();
    await resend.emails.send({
      from: "TGS SEO Center <noreply@techgeekstudio.com>",
      to: email,
      subject: `You've been invited to join ${team?.name ?? "a team"} on TechGeekStudio SEO Center`,
      html: `<p>You've been invited to join as a <strong>${role}</strong>.</p>
<p><a href="${appUrl}/team/invite/accept?token=${invite.token}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Accept Invitation</a></p>
<p>This invitation expires in 7 days.</p>`,
    });

    return ok({ inviteId: invite.id, email, token: invite.token });
  } catch (error) {
    if (isInvalidOriginError(error)) return fail("Forbidden", 403);
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    return fail("Failed to send invite");
  }
}

export async function DELETE(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();
    const body = await req.json();
    const { inviteId } = z.object({ inviteId: z.string() }).parse(body);

    const invite = await prisma.teamInvite.findUnique({ where: { id: inviteId }, include: { team: true } });
    if (!invite || invite.team.ownerId !== userId) return fail("Not authorized", 403);

    await prisma.teamInvite.delete({ where: { id: inviteId } });
    return ok({ deleted: true });
  } catch (error) {
    if (isUnauthorizedApiError(error)) return fail("Unauthorized", 401);
    return fail("Failed to cancel invite");
  }
}
