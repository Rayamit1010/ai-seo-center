import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/server/rate-limit";

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!(await checkRateLimit(`verify-email:${ip}`, 20, 3_600_000))) {
    return NextResponse.redirect(new URL("/verify-email?error=failed", req.url));
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=missing", req.url));
  }

  try {
    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!record) {
      return NextResponse.redirect(new URL("/verify-email?error=invalid", req.url));
    }
    if (record.expiresAt < new Date()) {
      await prisma.emailVerificationToken.delete({ where: { id: record.id } });
      return NextResponse.redirect(new URL("/verify-email?error=expired", req.url));
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
      prisma.emailVerificationToken.delete({ where: { id: record.id } }),
    ]);

    return NextResponse.redirect(new URL("/verify-email?success=1", req.url));
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(new URL("/verify-email?error=failed", req.url));
  }
}
