import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { type AIProviderId, streamClaude } from "@/lib/anthropic";
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
import { incrementAiUsage } from "@/lib/server/usage-tracker";
import { isQuotaExceededError } from "@/lib/payments/types";

const chatSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(12000, "Message is too long"),
  sessionId: z.string().nullish(),
  provider: z
    .enum(["claude", "chatgpt", "gemini", "grok", "groq", "openrouter"])
    .nullish(),
});

export async function POST(req: Request) {
  try {
    assertTrustedOrigin(req);
    const session = await getServerSession(authOptions);
    const userId = (session?.user as Record<string, unknown>)?.id as
      | string
      | undefined;
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    await incrementAiUsage(userId);

    const body = await req.json();
    const data = chatSchema.parse(body);
    const projectProfile = await resolveRelevantProjectProfile(userId, data.message);
    const projectContext = buildProjectProfileContext(projectProfile);
    const externalData = await getExternalDataSnapshot(projectProfile);
    const systemPrompt = buildChatSystemPrompt(
      projectContext,
      buildExternalDataContext(externalData)
    );

    // Get or create chat session
    let chatSession;
    if (data.sessionId) {
      chatSession = await prisma.chatSession.findFirst({
        where: { id: data.sessionId, userId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }

    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          userId,
          title: data.message.slice(0, 100),
        },
        include: { messages: true },
      });
    }

    await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          sessionId: chatSession.id,
          role: "user",
          content: data.message,
        },
      }),
      prisma.chatSession.update({
        where: { id: chatSession.id },
        data: {
          updatedAt: new Date(),
        },
      }),
    ]);

    // Build message history
    const messages = [
      ...chatSession.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: data.message },
    ];

    // Stream response through the AI router with project memory included
    let streamResult;
    try {
      streamResult = await streamClaude(systemPrompt, messages, 4096, {
        userId,
        preferredProviders: data.provider ? [data.provider as AIProviderId] : undefined,
        task: "chat",
      });
    } catch (aiErr) {
      console.error("All AI providers failed:", aiErr);
      const encoder = new TextEncoder();
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ text: "All AI providers are currently unavailable. Check your Claude, ChatGPT, Gemini, Grok, and Groq settings or wait for provider cooldowns to expire." })}\n\n`
            )
          );
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, sessionId: chatSession.id })}\n\n`
            )
          );
          controller.close();
        },
      });
      return new Response(errorStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }
    const { provider, providerName, stream } = streamResult;

    let fullResponse = "";
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ provider: providerName })}\n\n`
            )
          );
          if (projectProfile) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ projectName: projectProfile.name })}\n\n`
              )
            );
          }

          if (provider === "claude") {
            // Claude SDK stream — event-based
            const claudeStream = stream as AsyncIterable<{
              type: string;
              delta: { type: string; text: string };
            }>;
            for await (const event of claudeStream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                const text = event.delta.text;
                fullResponse += text;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                );
              }
            }
          } else {
            // OpenAI SSE stream — line-based
            const openaiStream = stream as ReadableStream<Uint8Array>;
            const reader = openaiStream.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data: ")) continue;
                const payload = trimmed.slice(6);
                if (payload === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(payload);
                  const text = parsed.choices?.[0]?.delta?.content;
                  if (text) {
                    fullResponse += text;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                    );
                  }
                } catch {
                  // skip malformed SSE lines
                }
              }
            }
          }

          // Save assistant response
          await prisma.$transaction([
            prisma.chatMessage.create({
              data: {
                sessionId: chatSession.id,
                role: "assistant",
                content: fullResponse,
              },
            }),
            prisma.chatSession.update({
              where: { id: chatSession.id },
              data: {
                updatedAt: new Date(),
              },
            }),
          ]);

          // Update session title from first exchange
          if (chatSession.messages.length === 0) {
            await prisma.chatSession.update({
              where: { id: chatSession.id },
              data: { title: data.message.slice(0, 100) },
            });
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, sessionId: chatSession.id })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream failed" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return new Response(
        JSON.stringify({
          error: "That request came from an unexpected origin.",
          reason: "The chat request was blocked because it did not come from this app.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    if (isQuotaExceededError(error)) {
      return new Response(
        JSON.stringify({
          error: `Daily AI call limit reached (${error.current}/${error.limit}). Upgrade your plan for more calls.`,
          reason: "quota_exceeded",
          upgradeUrl: "/billing",
        }),
        {
          status: 402,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: error.errors[0].message,
          reason:
            "The chat request arrived in an unexpected format. The app caught it safely, and the next request should work normally.",
        }),
        {
        status: 400,
        headers: { "Content-Type": "application/json" },
        }
      );
    }
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: "Chat failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/** GET: List chat sessions or load a session */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as Record<string, unknown>)?.id as
      | string
      | undefined;
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const chatSession = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              role: true,
              content: true,
              createdAt: true,
            },
          },
        },
      });

      if (!chatSession) {
        return new Response(JSON.stringify({ error: "Session not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, data: chatSession }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new Response(JSON.stringify({ success: true, data: sessions }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("List sessions error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch sessions" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
