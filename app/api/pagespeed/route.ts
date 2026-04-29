import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getPageSpeedData } from "@/lib/pagespeed";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";

const schema = z.object({
  url: z.string().url("Invalid URL"),
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { url } = schema.parse(body);

    const data = await getPageSpeedData(url);
    return NextResponse.json({ success: true, data });
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
    const message =
      error instanceof Error ? error.message : "PageSpeed analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
