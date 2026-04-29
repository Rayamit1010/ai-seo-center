import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { scrapeUrl, parseHtml } from "@/lib/scraper";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";

const scrapeSchema = z.object({
  url: z.string().url().optional(),
  html: z.string().min(10).optional(),
  inputType: z.enum(["url", "paste"]).default("url"),
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = scrapeSchema.parse(body);

    if (data.inputType === "url" && data.url) {
      const result = await scrapeUrl(data.url);
      return NextResponse.json({ success: true, data: result });
    }

    if (data.inputType === "paste" && data.html) {
      const result = parseHtml(data.html, "paste://input", 200, 0);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { error: "Provide either a URL or HTML content" },
      { status: 400 }
    );
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
      error instanceof Error ? error.message : "Scraping failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
