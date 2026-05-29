import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getResendClient } from "@/lib/resend";

const schema = z.object({
  email: z.string().trim().email(),
});

const EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);

    const ip =
      req.headers.get("x-vercel-forwarded-for") ??
      req.headers.get("x-forwarded-for")?.split(",")[0].trim();
    if (!ip) return NextResponse.json({ success: true }); // can't rate-limit → still succeed silently
    if (!(await checkRateLimit(`forgot-pw:${ip}`, 5, 15 * 60_000))) {
      return NextResponse.json({ success: true }); // silent rate limit — don't reveal
    }

    const body = await req.json();
    const { email } = schema.parse(body);
    const normalized = email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalized } });

    // Always return success to prevent email enumeration
    if (!user) return NextResponse.json({ success: true });

    // Invalidate existing unused tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    // Use cryptographically secure token instead of cuid()
    const token = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: randomBytes(32).toString("hex"),
        expiresAt: new Date(Date.now() + EXPIRY_MS),
      },
    });

    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${token.token}`;

    const resend = getResendClient();
    await resend.emails.send({
      from: "TGS SEO Center <noreply@techgeekstudio.com>",
      to: normalized,
      subject: "Reset your TechGeekStudio SEO Center password",
      html: `
        <p>Hi ${user.name ?? "there"},</p>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p>
          <a href="${resetUrl}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
            Reset Password
          </a>
        </p>
        <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <p>— TechGeekStudio Team</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Forgot password error:", error);
    return NextResponse.json({ success: true }); // still return success to prevent enumeration
  }
}
