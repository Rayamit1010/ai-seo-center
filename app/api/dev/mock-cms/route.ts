import { NextResponse } from "next/server";

function disabledResponse() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return disabledResponse();
  }

  const body = (await req.json().catch(() => ({}))) as {
    slug?: string;
    status?: string;
  };

  return NextResponse.json({
    id: `mock-${Date.now()}`,
    status: body.status || "draft",
    url: `https://example.test/${body.slug || "mock-post"}`,
  });
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return disabledResponse();
  }

  return NextResponse.json({
    ok: true,
    message: "Mock CMS endpoint is available in non-production environments.",
  });
}
