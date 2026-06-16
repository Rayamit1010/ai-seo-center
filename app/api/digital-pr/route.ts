import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callClaudeJSON } from "@/lib/anthropic";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import { checkRateLimit } from "@/lib/server/rate-limit";
import {
  buildPressReleasePrompt,
  buildPitchEmailPrompt,
  buildPublicationSuggestionsPrompt,
} from "@/lib/prompts/digital-pr";

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await checkRateLimit(`digital-pr:${userId}`, 10, 3_600_000))) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    const body = (await req.json()) as {
      action: string;
      topic?: string;
      angle?: string;
      niche?: string;
      keyMessages?: string[];
      headline?: string;
      contactName?: string;
      publication?: string;
      beat?: string;
    };

    if (body.action === "generate-release") {
      if (!body.topic || !body.angle || !body.niche) {
        return NextResponse.json({ error: "Topic, angle, and niche are required" }, { status: 400 });
      }
      const { system, user } = buildPressReleasePrompt({
        topic: body.topic,
        angle: body.angle,
        niche: body.niche,
        keyMessages: body.keyMessages ?? [],
      });
      const result = await callClaudeJSON(system, user, 4096, { userId, task: "pr-release" });
      return NextResponse.json({ success: true, data: result });
    }

    if (body.action === "generate-pitch") {
      if (!body.topic || !body.angle || !body.contactName || !body.publication) {
        return NextResponse.json({ error: "Topic, angle, contact name, and publication are required" }, { status: 400 });
      }
      const { system, user } = buildPitchEmailPrompt({
        topic: body.topic,
        angle: body.angle,
        headline: body.headline ?? body.topic,
        contactName: body.contactName,
        publication: body.publication,
        beat: body.beat ?? "general",
      });
      const result = await callClaudeJSON(system, user, 2048, { userId, task: "pr-pitch" });
      return NextResponse.json({ success: true, data: result });
    }

    if (body.action === "suggest-publications") {
      if (!body.topic || !body.niche || !body.angle) {
        return NextResponse.json({ error: "Topic, niche, and angle are required" }, { status: 400 });
      }
      const { system, user } = buildPublicationSuggestionsPrompt({
        topic: body.topic,
        niche: body.niche,
        angle: body.angle,
      });
      const result = await callClaudeJSON(system, user, 4096, { userId, task: "pr-publications" });
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (isInvalidOriginError(error)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    console.error("Digital PR generation error:", error);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
