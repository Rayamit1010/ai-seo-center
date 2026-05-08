import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getRequiredUserId, isUnauthorizedApiError } from "@/lib/server/auth";
import { getResendClient } from "@/lib/resend";

const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const userId = await getRequiredUserId();

    if (!(await checkRateLimit(`send-verif:${userId}`, 3, 60 * 60_000))) {
      return NextResponse.json(
        { error: "Too many verification emails. Please wait an hour." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    // Invalidate old tokens
    await prisma.emailVerificationToken.deleteMany({ where: { userId } });

    const token = await prisma.emailVerificationToken.create({
      data: {
        userId,
        expiresAt: new Date(Date.now() + EXPIRY_MS),
      },
    });

    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const verifyUrl = `${appUrl}/verify-email?token=${token.token}`;

    const resend = getResendClient();
    await resend.emails.send({
      from: "TGS SEO Center <noreply@techgeekstudio.com>",
      to: user.email,
      subject: "Verify your TechGeekStudio SEO Center email",
      html: `
        <p>Hi ${user.name ?? "there"},</p>
        <p>Thanks for registering! Please verify your email address:</p>
        <p>
          <a href="${verifyUrl}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
            Verify Email
          </a>
        </p>
        <p>This link expires in 24 hours.</p>
        <p>— TechGeekStudio Team</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isInvalidOriginError(error)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (isUnauthorizedApiError(error)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("Send verification error:", error);
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
  }
}
