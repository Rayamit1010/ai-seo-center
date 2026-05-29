import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/server/rate-limit";

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!(await checkRateLimit(`unsub:${ip}`, 10, 60_000))) {
    return NextResponse.redirect(new URL("/unsubscribed?error=rate-limited", req.url));
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/unsubscribed?error=missing", req.url));
  }

  const user = await prisma.user.findUnique({
    where: { unsubscribeToken: token },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    return NextResponse.redirect(new URL("/unsubscribed?error=invalid", req.url));
  }

  // Nullify token to consume it (one-click unsubscribe spec) and mark role to block marketing emails
  await prisma.user.update({
    where: { id: user.id },
    data: { unsubscribeToken: null, role: user.role === "admin" ? "admin" : "unsubscribed" },
  });

  return NextResponse.redirect(new URL("/unsubscribed?success=1", req.url));
}
