import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { callClaude, type AIProviderId } from "@/lib/anthropic";
import { buildChatSystemPrompt } from "@/lib/prompts/chat";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";
import {
  buildExternalDataContext,
  getExternalDataSnapshot,
} from "@/lib/services/external-data-service";
import {
  buildProjectProfileContext,
  resolveRelevantProjectProfile,
} from "@/lib/services/project-profile-service";

const compareSchema = z.object({
  message: z.string().min(1, "Message is required"),
  providers: z
    .array(z.enum(["claude", "chatgpt", "gemini", "grok", "groq", "openrouter"]))
    .min(2)
    .max(6),
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
    const data = compareSchema.parse(body);
    const projectProfile = await resolveRelevantProjectProfile(userId, data.message);
    const externalData = await getExternalDataSnapshot(projectProfile);
    const systemPrompt = buildChatSystemPrompt(
      buildProjectProfileContext(projectProfile),
      buildExternalDataContext(externalData)
    );

    const results = await Promise.all(
      data.providers.map(async (providerId) => {
        try {
          const content = await callClaude(
            systemPrompt,
            data.message,
            4096,
            {
              userId,
              preferredProviders: [providerId as AIProviderId],
              allowFallback: false,
              task: `compare:${providerId}`,
            }
          );

          return {
            providerId,
            ok: true,
            content,
          };
        } catch (error) {
          return {
            providerId,
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return NextResponse.json({ error: "That request came from an unexpected origin." }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }

    console.error("Chat compare error:", error);
    return NextResponse.json({ error: "Compare failed" }, { status: 500 });
  }
}
