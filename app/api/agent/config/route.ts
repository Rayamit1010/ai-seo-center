import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { getAISettingsSummary } from "@/lib/anthropic";
import { assertTrustedOrigin, isInvalidOriginError } from "@/lib/server/csrf";

const providerIdSchema = z.enum(["claude", "chatgpt", "gemini", "grok", "groq", "openrouter"]);

const configUpdateSchema = z.object({
  fromEmail: z.string().optional(),
  fromName: z.string().optional(),
  dailyEmailLimit: z.number().min(1).max(200).optional(),
  blockedDomains: z.array(z.string()).optional(),
  autoDiscover: z.boolean().optional(),
  autoQualify: z.boolean().optional(),
  autoContact: z.boolean().optional(),
  autoDraft: z.boolean().optional(),
  autoSend: z.boolean().optional(),
  autoFollowUp: z.boolean().optional(),
  cycleIntervalMinutes: z.number().min(5).max(240).optional(),
  isEnabled: z.boolean().optional(),
  providerOrder: z.array(providerIdSchema).min(1).max(6).optional(),
  providerLoopEnabled: z.boolean().optional(),
  providerCooldownMins: z.number().min(1).max(120).optional(),
  chatgptApiKey: z.string().optional(),
  claudeApiKey: z.string().optional(),
  geminiApiKey: z.string().optional(),
  grokApiKey: z.string().optional(),
  groqApiKey: z.string().optional(),
  openrouterApiKey: z.string().optional(),
  chatgptModel: z.string().min(1).max(100).optional(),
  claudeModel: z.string().min(1).max(100).optional(),
  geminiModel: z.string().min(1).max(100).optional(),
  grokModel: z.string().min(1).max(100).optional(),
  groqModel: z.string().min(1).max(100).optional(),
  openrouterModel: z.string().min(1).max(100).optional(),
});

function isGroqKey(value: string | undefined) {
  return Boolean(value?.trim().startsWith("gsk_"));
}

async function buildConfigResponse(userId: string) {
  let config = await prisma.agentConfig.findUnique({ where: { userId } });
  if (!config) {
    config = await prisma.agentConfig.create({
      data: { userId },
    });
  }

  return {
    id: config.id,
    userId: config.userId,
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    dailyEmailLimit: config.dailyEmailLimit,
    emailsSentToday: config.emailsSentToday,
    lastResetDate: config.lastResetDate,
    blockedDomains: JSON.parse(config.blockedDomains),
    autoDiscover: config.autoDiscover,
    autoQualify: config.autoQualify,
    autoContact: config.autoContact,
    autoDraft: config.autoDraft,
    autoSend: config.autoSend,
    autoFollowUp: config.autoFollowUp,
    cycleIntervalMinutes: config.cycleIntervalMinutes,
    lastHeartbeatAt: config.lastHeartbeatAt,
    isEnabled: config.isEnabled,
    ai: await getAISettingsSummary(userId),
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

function jsonNoStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      ...(init?.headers ?? {}),
    },
  });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as Record<string, unknown>)?.id as string | undefined;
    if (!userId) {
      return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }

    return jsonNoStore({
      success: true,
      data: await buildConfigResponse(userId),
    });
  } catch (error) {
    console.error("Get agent config error:", error);
    return jsonNoStore({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    assertTrustedOrigin(req);
    const session = await getServerSession(authOptions);
    const userId = (session?.user as Record<string, unknown>)?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = configUpdateSchema.parse(body);
    const normalizedGroqApiKey =
      data.groqApiKey !== undefined
        ? data.groqApiKey
        : isGroqKey(data.grokApiKey)
          ? data.grokApiKey
          : undefined;
    const normalizedGrokApiKey =
      isGroqKey(data.grokApiKey) && data.groqApiKey === undefined
        ? ""
        : data.grokApiKey;

    const updateData: Record<string, unknown> = {};
    if (data.fromEmail !== undefined) updateData.fromEmail = data.fromEmail;
    if (data.fromName !== undefined) updateData.fromName = data.fromName;
    if (data.dailyEmailLimit !== undefined) updateData.dailyEmailLimit = data.dailyEmailLimit;
    if (data.blockedDomains !== undefined) updateData.blockedDomains = JSON.stringify(data.blockedDomains);
    if (data.autoDiscover !== undefined) updateData.autoDiscover = data.autoDiscover;
    if (data.autoQualify !== undefined) updateData.autoQualify = data.autoQualify;
    if (data.autoContact !== undefined) updateData.autoContact = data.autoContact;
    if (data.autoDraft !== undefined) updateData.autoDraft = data.autoDraft;
    if (data.autoSend !== undefined) updateData.autoSend = data.autoSend;
    if (data.autoFollowUp !== undefined) updateData.autoFollowUp = data.autoFollowUp;
    if (data.cycleIntervalMinutes !== undefined) updateData.cycleIntervalMinutes = data.cycleIntervalMinutes;
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
    if (data.providerOrder !== undefined) updateData.providerOrder = JSON.stringify(data.providerOrder);
    if (data.providerLoopEnabled !== undefined) updateData.providerLoopEnabled = data.providerLoopEnabled;
    if (data.providerCooldownMins !== undefined) updateData.providerCooldownMins = data.providerCooldownMins;
    if (data.chatgptApiKey !== undefined) updateData.chatgptApiKeyEnc = data.chatgptApiKey.trim() ? encryptSecret(data.chatgptApiKey.trim()) : null;
    if (data.claudeApiKey !== undefined) updateData.claudeApiKeyEnc = data.claudeApiKey.trim() ? encryptSecret(data.claudeApiKey.trim()) : null;
    if (data.geminiApiKey !== undefined) updateData.geminiApiKeyEnc = data.geminiApiKey.trim() ? encryptSecret(data.geminiApiKey.trim()) : null;
    if (normalizedGrokApiKey !== undefined) updateData.grokApiKeyEnc = normalizedGrokApiKey.trim() ? encryptSecret(normalizedGrokApiKey.trim()) : null;
    if (normalizedGroqApiKey !== undefined) updateData.groqApiKeyEnc = normalizedGroqApiKey.trim() ? encryptSecret(normalizedGroqApiKey.trim()) : null;
    if (data.openrouterApiKey !== undefined) updateData.openrouterApiKeyEnc = data.openrouterApiKey.trim() ? encryptSecret(data.openrouterApiKey.trim()) : null;
    if (data.chatgptModel !== undefined) updateData.chatgptModel = data.chatgptModel.trim();
    if (data.claudeModel !== undefined) updateData.claudeModel = data.claudeModel.trim();
    if (data.geminiModel !== undefined) updateData.geminiModel = data.geminiModel.trim();
    if (data.grokModel !== undefined) updateData.grokModel = data.grokModel.trim();
    if (data.groqModel !== undefined) updateData.groqModel = data.groqModel.trim();
    if (data.openrouterModel !== undefined) updateData.openrouterModel = data.openrouterModel.trim();

    await prisma.agentConfig.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData },
    });

    return jsonNoStore({
      success: true,
      data: await buildConfigResponse(userId),
    });
  } catch (error) {
    if (isInvalidOriginError(error)) {
      return jsonNoStore({ error: "That request came from an unexpected origin." }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return jsonNoStore({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Update agent config error:", error);
    return jsonNoStore({ error: "Failed to update config" }, { status: 500 });
  }
}
