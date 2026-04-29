import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { callClaudeJSON } from "@/lib/anthropic";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import {
  buildBacklinkStrategyPrompt,
  buildDomainQualifierPrompt,
} from "@/lib/prompts/backlinks";

const strategySchema = z.object({
  action: z.enum(["strategy", "qualify"]),
  // Strategy fields
  targetUrl: z.string().url().optional(),
  industry: z.string().optional(),
  targetCountry: z.string().optional(),
  currentDR: z.number().min(0).max(100).optional(),
  // Qualifier fields
  domains: z.array(z.string()).optional(),
  niche: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = strategySchema.parse(body);

    if (data.action === "strategy") {
      if (!data.targetUrl || !data.industry || !data.targetCountry) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      const { system, user } = buildBacklinkStrategyPrompt({
        targetUrl: data.targetUrl,
        industry: data.industry,
        targetCountry: data.targetCountry,
        currentDR: data.currentDR ?? 10,
      });
      const result = await callClaudeJSON(system, user, 8192, { userId, task: "backlinks-strategy" });
      return NextResponse.json({ success: true, data: result });
    }

    if (data.action === "qualify") {
      if (!data.domains?.length || !data.niche) {
        return NextResponse.json({ error: "Domains and niche are required" }, { status: 400 });
      }
      const { system, user } = buildDomainQualifierPrompt(data.domains, data.niche);
      const result = await callClaudeJSON(system, user, 4096, { userId, task: "backlinks-qualify" });
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return NextResponse.json({ error: "That request came from an unexpected origin." }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Backlink error:", error);
    return NextResponse.json({ error: "Backlink analysis failed" }, { status: 500 });
  }
}
