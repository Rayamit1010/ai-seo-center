import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { normalizeUrl } from "@/lib/utils";
import type { ProjectCmsPublishStatus, ProjectCmsProvider } from "@/lib/services/project-profile-service";

export interface CmsPublishInput {
  userId: string;
  projectId: string;
  title: string;
  html: string;
  excerpt?: string;
  slug?: string;
  status?: ProjectCmsPublishStatus;
}

export interface CmsPublishResult {
  provider: ProjectCmsProvider;
  status: string;
  externalId?: string;
  url?: string | null;
}

function toBasicAuth(username: string, password: string) {
  return Buffer.from(`${username}:${password}`, "utf8").toString("base64");
}

function cleanBaseUrl(url: string) {
  return normalizeUrl(url).replace(/\/+$/, "");
}

async function getProjectCmsConfig(userId: string, projectId: string) {
  const profile = await prisma.projectProfile.findFirst({
    where: { id: projectId, userId },
    select: {
      id: true,
      name: true,
      websiteUrl: true,
      cmsProvider: true,
      cmsBaseUrl: true,
      cmsUsername: true,
      cmsAppPasswordEnc: true,
      cmsWebhookUrl: true,
      cmsPublishStatus: true,
    },
  });

  if (!profile) {
    throw new Error("That project profile could not be found.");
  }

  return {
    ...profile,
    cmsProvider: profile.cmsProvider as ProjectCmsProvider,
    cmsPublishStatus: profile.cmsPublishStatus as ProjectCmsPublishStatus,
    cmsSecret: decryptSecret(profile.cmsAppPasswordEnc),
  };
}

export async function inspectProjectCmsConnection(userId: string, projectId: string) {
  const config = await getProjectCmsConfig(userId, projectId);

  if (config.cmsProvider === "none") {
    return {
      provider: "none" as const,
      configured: false,
      ok: false,
      message: "No CMS provider is configured for this project yet.",
    };
  }

  if (config.cmsProvider === "wordpress") {
    if (!config.cmsBaseUrl || !config.cmsUsername || !config.cmsSecret) {
      return {
        provider: "wordpress" as const,
        configured: true,
        ok: false,
        message: "WordPress needs a base URL, username, and app password before publishing can work.",
      };
    }

    try {
      const response = await fetch(`${cleanBaseUrl(config.cmsBaseUrl)}/wp-json`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });

      return {
        provider: "wordpress" as const,
        configured: true,
        ok: response.ok,
        message: response.ok
          ? "WordPress looks reachable and ready for publishing."
          : `WordPress responded with ${response.status}. Check the site URL or server access.`,
      };
    } catch (error) {
      return {
        provider: "wordpress" as const,
        configured: true,
        ok: false,
        message: error instanceof Error ? error.message : "WordPress could not be reached.",
      };
    }
  }

  return {
    provider: "webhook" as const,
    configured: true,
    ok: Boolean(config.cmsWebhookUrl && config.cmsSecret),
    message:
      config.cmsWebhookUrl && config.cmsSecret
        ? "Webhook publishing is configured. A live endpoint ping is not enforced because many webhook receivers reject probes."
        : "Webhook publishing needs both a webhook URL and a secret/token.",
  };
}

async function publishToWordPress(config: Awaited<ReturnType<typeof getProjectCmsConfig>>, input: CmsPublishInput) {
  if (!config.cmsBaseUrl || !config.cmsUsername || !config.cmsSecret) {
    throw new Error("WordPress publishing needs a base URL, username, and app password.");
  }

  const response = await fetch(`${cleanBaseUrl(config.cmsBaseUrl)}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${toBasicAuth(config.cmsUsername, config.cmsSecret)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: input.title,
      content: input.html,
      excerpt: input.excerpt || undefined,
      slug: input.slug || undefined,
      status: input.status || config.cmsPublishStatus || "draft",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`WordPress returned ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { id?: number; link?: string; status?: string };
  return {
    provider: "wordpress" as const,
    status: data.status || input.status || "draft",
    externalId: data.id ? String(data.id) : undefined,
    url: data.link || null,
  };
}

async function publishToWebhook(config: Awaited<ReturnType<typeof getProjectCmsConfig>>, input: CmsPublishInput) {
  if (!config.cmsWebhookUrl) {
    throw new Error("Webhook publishing needs a webhook URL.");
  }

  const response = await fetch(config.cmsWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.cmsSecret ? { Authorization: `Bearer ${config.cmsSecret}` } : {}),
    },
    body: JSON.stringify({
      projectId: config.id,
      projectName: config.name,
      websiteUrl: config.websiteUrl,
      title: input.title,
      html: input.html,
      excerpt: input.excerpt || "",
      slug: input.slug || "",
      status: input.status || config.cmsPublishStatus || "draft",
      publishedAt: new Date().toISOString(),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`CMS webhook returned ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json().catch(() => ({}))) as {
    id?: string | number;
    url?: string;
    status?: string;
  };

  return {
    provider: "webhook" as const,
    status: data.status || input.status || "draft",
    externalId: data.id ? String(data.id) : undefined,
    url: data.url || null,
  };
}

export async function publishToProjectCms(input: CmsPublishInput): Promise<CmsPublishResult> {
  const config = await getProjectCmsConfig(input.userId, input.projectId);

  if (config.cmsProvider === "wordpress") {
    return publishToWordPress(config, input);
  }

  if (config.cmsProvider === "webhook") {
    return publishToWebhook(config, input);
  }

  throw new Error("This project does not have a CMS publishing provider configured yet.");
}
