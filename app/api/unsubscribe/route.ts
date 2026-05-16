import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
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
