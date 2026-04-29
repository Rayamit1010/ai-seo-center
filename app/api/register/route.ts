import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { checkRateLimit } from "@/lib/server/rate-limit";

const registerSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[0-9]/, "Password must include a number"),
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const forwardedFor = req.headers.get("x-forwarded-for") || "unknown";
    if (!(await checkRateLimit(`register:${forwardedFor}`, 5, 60_000))) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please wait a minute." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const data = registerSchema.parse(body);
    const normalizedEmail = data.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: data.name,
        company: data.company || "TechGeekStudio",
        website: data.website || "https://techgeekstudio.com",
      },
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return NextResponse.json(
        { error: "That request came from an unexpected origin." },
        { status: 403 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
