import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { parseStoredJson } from "@/lib/server/response";
import { extractDomain, isValidUrl, normalizeUrl } from "@/lib/utils";

export type ProjectCmsProvider = "none" | "wordpress" | "webhook";
export type ProjectCmsPublishStatus = "draft" | "publish";

export interface ProjectProfileRecord {
  id: string;
  userId: string;
  name: string;
  websiteUrl: string;
  domain: string;
  industry: string;
  targetCountry: string;
  targetAudience: string;
  brandVoice: string;
  businessGoal: string;
  conversionGoals: string[];
  primaryServices: string[];
  backlinkRules: {
    preferredAngles: string[];
    avoidPatterns: string[];
    anchorGuidelines: string;
  };
  contentPlaybook: {
    pillarTopics: string[];
    freshnessCadence: string;
    eeatNotes: string[];
  };
  nichePlaybook: {
    positioning: string;
    competitors: string[];
    differentiators: string[];
  };
  searchConsoleSiteUrl: string | null;
  ga4PropertyId: string | null;
  cmsProvider: ProjectCmsProvider;
  cmsBaseUrl: string | null;
  cmsUsername: string | null;
  cmsWebhookUrl: string | null;
  cmsPublishStatus: ProjectCmsPublishStatus;
  hasCmsSecret: boolean;
  cmsSecretPreview: string | null;
  notes: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type RawProjectProfile = {
  id: string;
  userId: string;
  name: string;
  websiteUrl: string;
  domain: string;
  industry: string;
  targetCountry: string;
  targetAudience: string;
  brandVoice: string;
  businessGoal: string;
  conversionGoals: string;
  primaryServices: string;
  backlinkRules: string;
  contentPlaybook: string;
  nichePlaybook: string;
  searchConsoleSiteUrl: string | null;
  ga4PropertyId: string | null;
  cmsProvider: string;
  cmsBaseUrl: string | null;
  cmsUsername: string | null;
  cmsAppPasswordEnc: string | null;
  cmsWebhookUrl: string | null;
  cmsPublishStatus: string;
  notes: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeOptionalUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const normalized = normalizeUrl(trimmed);
  if (!isValidUrl(normalized)) {
    throw new Error("Connected URLs must be valid http or https URLs.");
  }
  return normalized;
}

function normalizeSearchConsoleSiteUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("sc-domain:")) {
    const domain = trimmed.slice("sc-domain:".length).trim();
    if (!domain) {
      throw new Error("Search Console domain properties must look like sc-domain:example.com.");
    }
    return `sc-domain:${domain}`;
  }

  const normalized = normalizeUrl(trimmed);
  if (!isValidUrl(normalized)) {
    throw new Error("Search Console property must be a valid URL or sc-domain: property.");
  }
  return normalized;
}

function normalizeGa4PropertyId(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) {
    throw new Error("GA4 property ID should contain numbers only.");
  }
  return trimmed;
}

function normalizeCmsProvider(value: string | null | undefined): ProjectCmsProvider {
  if (value === "wordpress" || value === "webhook") {
    return value;
  }
  return "none";
}

function normalizeCmsPublishStatus(value: string | null | undefined): ProjectCmsPublishStatus {
  return value === "publish" ? "publish" : "draft";
}

function parseStringArray(value: string, fallback: string[] = []) {
  const parsed = parseStoredJson(value, fallback);
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string")
    : fallback;
}

function parseBacklinkRules(value: string) {
  const parsed = parseStoredJson(value, {} as Record<string, unknown>);
  return {
    preferredAngles: Array.isArray(parsed.preferredAngles)
      ? parsed.preferredAngles.filter((item): item is string => typeof item === "string")
      : [],
    avoidPatterns: Array.isArray(parsed.avoidPatterns)
      ? parsed.avoidPatterns.filter((item): item is string => typeof item === "string")
      : [],
    anchorGuidelines:
      typeof parsed.anchorGuidelines === "string" ? parsed.anchorGuidelines : "",
  };
}

function parseContentPlaybook(value: string) {
  const parsed = parseStoredJson(value, {} as Record<string, unknown>);
  return {
    pillarTopics: Array.isArray(parsed.pillarTopics)
      ? parsed.pillarTopics.filter((item): item is string => typeof item === "string")
      : [],
    freshnessCadence:
      typeof parsed.freshnessCadence === "string" ? parsed.freshnessCadence : "",
    eeatNotes: Array.isArray(parsed.eeatNotes)
      ? parsed.eeatNotes.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function parseNichePlaybook(value: string) {
  const parsed = parseStoredJson(value, {} as Record<string, unknown>);
  return {
    positioning: typeof parsed.positioning === "string" ? parsed.positioning : "",
    competitors: Array.isArray(parsed.competitors)
      ? parsed.competitors.filter((item): item is string => typeof item === "string")
      : [],
    differentiators: Array.isArray(parsed.differentiators)
      ? parsed.differentiators.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function mapProjectProfile(profile: {
  [K in keyof RawProjectProfile]: RawProjectProfile[K];
}): ProjectProfileRecord {
  return {
    ...profile,
    conversionGoals: parseStringArray(profile.conversionGoals),
    primaryServices: parseStringArray(profile.primaryServices),
    backlinkRules: parseBacklinkRules(profile.backlinkRules),
    contentPlaybook: parseContentPlaybook(profile.contentPlaybook),
    nichePlaybook: parseNichePlaybook(profile.nichePlaybook),
    searchConsoleSiteUrl: profile.searchConsoleSiteUrl,
    ga4PropertyId: profile.ga4PropertyId,
    cmsProvider: normalizeCmsProvider(profile.cmsProvider),
    cmsBaseUrl: profile.cmsBaseUrl,
    cmsUsername: profile.cmsUsername,
    cmsWebhookUrl: profile.cmsWebhookUrl,
    cmsPublishStatus: normalizeCmsPublishStatus(profile.cmsPublishStatus),
    hasCmsSecret: Boolean(profile.cmsAppPasswordEnc),
    cmsSecretPreview: profile.cmsAppPasswordEnc ? "Configured" : null,
  };
}

export function buildProjectProfileContext(profile: ProjectProfileRecord | null | undefined) {
  if (!profile) {
    return "";
  }

  return [
    `Project: ${profile.name}`,
    `Website: ${profile.websiteUrl}`,
    `Industry: ${profile.industry}`,
    `Target country: ${profile.targetCountry}`,
    `Target audience: ${profile.targetAudience || "Not specified"}`,
    `Business goal: ${profile.businessGoal || "Not specified"}`,
    `Brand voice: ${profile.brandVoice || "Not specified"}`,
    `Primary services: ${profile.primaryServices.length > 0 ? profile.primaryServices.join(", ") : "Not specified"}`,
    `Conversion goals: ${profile.conversionGoals.length > 0 ? profile.conversionGoals.join(", ") : "Not specified"}`,
    `Backlink rules: preferred angles = ${profile.backlinkRules.preferredAngles.join(", ") || "Not specified"}; avoid patterns = ${profile.backlinkRules.avoidPatterns.join(", ") || "Not specified"}; anchor guidance = ${profile.backlinkRules.anchorGuidelines || "Not specified"}`,
    `Content playbook: pillar topics = ${profile.contentPlaybook.pillarTopics.join(", ") || "Not specified"}; freshness cadence = ${profile.contentPlaybook.freshnessCadence || "Not specified"}; E-E-A-T notes = ${profile.contentPlaybook.eeatNotes.join(", ") || "Not specified"}`,
    `Niche playbook: positioning = ${profile.nichePlaybook.positioning || "Not specified"}; competitors = ${profile.nichePlaybook.competitors.join(", ") || "Not specified"}; differentiators = ${profile.nichePlaybook.differentiators.join(", ") || "Not specified"}`,
    `Search Console property: ${profile.searchConsoleSiteUrl || "Not connected"}`,
    `GA4 property: ${profile.ga4PropertyId || "Not connected"}`,
    `CMS publishing: provider = ${profile.cmsProvider}; publish status = ${profile.cmsPublishStatus}; base URL = ${profile.cmsBaseUrl || "Not connected"}; webhook = ${profile.cmsWebhookUrl || "Not connected"}`,
    `Operator notes: ${profile.notes || "None"}`,
  ].join("\n");
}

export async function listProjectProfiles(userId: string) {
  const profiles = await prisma.projectProfile.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return profiles.map(mapProjectProfile);
}

export async function getProjectProfile(userId: string, id: string) {
  const profile = await prisma.projectProfile.findFirst({
    where: { id, userId },
  });

  return profile ? mapProjectProfile(profile) : null;
}

export async function createProjectProfile(params: {
  userId: string;
  name: string;
  websiteUrl: string;
  industry: string;
  targetCountry?: string;
  targetAudience?: string;
  brandVoice?: string;
  businessGoal?: string;
  conversionGoals?: string[];
  primaryServices?: string[];
  backlinkRules?: ProjectProfileRecord["backlinkRules"];
  contentPlaybook?: ProjectProfileRecord["contentPlaybook"];
  nichePlaybook?: ProjectProfileRecord["nichePlaybook"];
  searchConsoleSiteUrl?: string;
  ga4PropertyId?: string;
  cmsProvider?: ProjectCmsProvider;
  cmsBaseUrl?: string;
  cmsUsername?: string;
  cmsAppPassword?: string;
  cmsWebhookUrl?: string;
  cmsPublishStatus?: ProjectCmsPublishStatus;
  notes?: string;
  isDefault?: boolean;
}) {
  const websiteUrl = normalizeUrl(params.websiteUrl.trim());
  if (!isValidUrl(websiteUrl)) {
    throw new Error("Website URL must be a valid http or https URL.");
  }
  const domain = extractDomain(websiteUrl);
  const existingCount = await prisma.projectProfile.count({
    where: { userId: params.userId },
  });
  const shouldBeDefault = Boolean(params.isDefault) || existingCount === 0;
  const cmsProvider = normalizeCmsProvider(params.cmsProvider);

  if (shouldBeDefault) {
    await prisma.projectProfile.updateMany({
      where: { userId: params.userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const profile = await prisma.projectProfile.create({
    data: {
      userId: params.userId,
      name: params.name.trim(),
      websiteUrl,
      domain,
      industry: params.industry.trim(),
      targetCountry: params.targetCountry?.trim() || "Global",
      targetAudience: params.targetAudience?.trim() || "",
      brandVoice: params.brandVoice?.trim() || "",
      businessGoal: params.businessGoal?.trim() || "",
      conversionGoals: JSON.stringify(params.conversionGoals || []),
      primaryServices: JSON.stringify(params.primaryServices || []),
      backlinkRules: JSON.stringify(
        params.backlinkRules || {
          preferredAngles: [],
          avoidPatterns: [],
          anchorGuidelines: "",
        }
      ),
      contentPlaybook: JSON.stringify(
        params.contentPlaybook || {
          pillarTopics: [],
          freshnessCadence: "",
          eeatNotes: [],
        }
      ),
      nichePlaybook: JSON.stringify(
        params.nichePlaybook || {
          positioning: "",
          competitors: [],
          differentiators: [],
        }
      ),
      searchConsoleSiteUrl: normalizeSearchConsoleSiteUrl(params.searchConsoleSiteUrl),
      ga4PropertyId: normalizeGa4PropertyId(params.ga4PropertyId),
      cmsProvider,
      cmsBaseUrl: normalizeOptionalUrl(params.cmsBaseUrl),
      cmsUsername: params.cmsUsername?.trim() || null,
      cmsAppPasswordEnc: params.cmsAppPassword?.trim()
        ? encryptSecret(params.cmsAppPassword.trim())
        : null,
      cmsWebhookUrl: normalizeOptionalUrl(params.cmsWebhookUrl),
      cmsPublishStatus: normalizeCmsPublishStatus(params.cmsPublishStatus),
      notes: params.notes?.trim() || null,
      isDefault: shouldBeDefault,
    },
  });

  return mapProjectProfile(profile);
}

export async function updateProjectProfile(params: {
  userId: string;
  id: string;
  updates: Partial<{
    name: string;
    websiteUrl: string;
    industry: string;
    targetCountry: string;
    targetAudience: string;
    brandVoice: string;
    businessGoal: string;
    conversionGoals: string[];
    primaryServices: string[];
    backlinkRules: ProjectProfileRecord["backlinkRules"];
    contentPlaybook: ProjectProfileRecord["contentPlaybook"];
    nichePlaybook: ProjectProfileRecord["nichePlaybook"];
    searchConsoleSiteUrl: string;
    ga4PropertyId: string;
    cmsProvider: ProjectCmsProvider;
    cmsBaseUrl: string;
    cmsUsername: string;
    cmsAppPassword: string;
    cmsWebhookUrl: string;
    cmsPublishStatus: ProjectCmsPublishStatus;
    notes: string;
    isDefault: boolean;
  }>;
}) {
  const current = await prisma.projectProfile.findFirst({
    where: { id: params.id, userId: params.userId },
  });

  if (!current) {
    return null;
  }

  const nextWebsiteUrl = params.updates.websiteUrl
    ? normalizeUrl(params.updates.websiteUrl.trim())
    : current.websiteUrl;

  if (!isValidUrl(nextWebsiteUrl)) {
    throw new Error("Website URL must be a valid http or https URL.");
  }

  if (params.updates.isDefault) {
    await prisma.projectProfile.updateMany({
      where: { userId: params.userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.projectProfile.update({
    where: { id: current.id },
    data: {
      name: params.updates.name?.trim() ?? current.name,
      websiteUrl: nextWebsiteUrl,
      domain: extractDomain(nextWebsiteUrl),
      industry: params.updates.industry?.trim() ?? current.industry,
      targetCountry: params.updates.targetCountry?.trim() ?? current.targetCountry,
      targetAudience: params.updates.targetAudience?.trim() ?? current.targetAudience,
      brandVoice: params.updates.brandVoice?.trim() ?? current.brandVoice,
      businessGoal: params.updates.businessGoal?.trim() ?? current.businessGoal,
      conversionGoals:
        params.updates.conversionGoals !== undefined
          ? JSON.stringify(params.updates.conversionGoals)
          : current.conversionGoals,
      primaryServices:
        params.updates.primaryServices !== undefined
          ? JSON.stringify(params.updates.primaryServices)
          : current.primaryServices,
      backlinkRules:
        params.updates.backlinkRules !== undefined
          ? JSON.stringify(params.updates.backlinkRules)
          : current.backlinkRules,
      contentPlaybook:
        params.updates.contentPlaybook !== undefined
          ? JSON.stringify(params.updates.contentPlaybook)
          : current.contentPlaybook,
      nichePlaybook:
        params.updates.nichePlaybook !== undefined
          ? JSON.stringify(params.updates.nichePlaybook)
          : current.nichePlaybook,
      searchConsoleSiteUrl:
        params.updates.searchConsoleSiteUrl !== undefined
          ? normalizeSearchConsoleSiteUrl(params.updates.searchConsoleSiteUrl)
          : current.searchConsoleSiteUrl,
      ga4PropertyId:
        params.updates.ga4PropertyId !== undefined
          ? normalizeGa4PropertyId(params.updates.ga4PropertyId)
          : current.ga4PropertyId,
      cmsProvider:
        params.updates.cmsProvider !== undefined
          ? normalizeCmsProvider(params.updates.cmsProvider)
          : normalizeCmsProvider(current.cmsProvider),
      cmsBaseUrl:
        params.updates.cmsBaseUrl !== undefined
          ? normalizeOptionalUrl(params.updates.cmsBaseUrl)
          : current.cmsBaseUrl,
      cmsUsername:
        params.updates.cmsUsername !== undefined
          ? params.updates.cmsUsername.trim() || null
          : current.cmsUsername,
      cmsAppPasswordEnc:
        params.updates.cmsAppPassword !== undefined
          ? params.updates.cmsAppPassword.trim()
            ? encryptSecret(params.updates.cmsAppPassword.trim())
            : null
          : current.cmsAppPasswordEnc,
      cmsWebhookUrl:
        params.updates.cmsWebhookUrl !== undefined
          ? normalizeOptionalUrl(params.updates.cmsWebhookUrl)
          : current.cmsWebhookUrl,
      cmsPublishStatus:
        params.updates.cmsPublishStatus !== undefined
          ? normalizeCmsPublishStatus(params.updates.cmsPublishStatus)
          : normalizeCmsPublishStatus(current.cmsPublishStatus),
      notes:
        params.updates.notes !== undefined
          ? params.updates.notes.trim() || null
          : current.notes,
      isDefault: params.updates.isDefault ?? current.isDefault,
    },
  });

  return mapProjectProfile(updated);
}

export async function deleteProjectProfile(userId: string, id: string) {
  const current = await prisma.projectProfile.findFirst({
    where: { id, userId },
    select: { id: true, isDefault: true },
  });

  if (!current) {
    return null;
  }

  await prisma.projectProfile.delete({ where: { id } });

  if (current.isDefault) {
    const fallback = await prisma.projectProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (fallback) {
      await prisma.projectProfile.update({
        where: { id: fallback.id },
        data: { isDefault: true },
      });
    }
  }

  return current;
}

export async function resolveProjectProfileByUrl(userId: string, url: string) {
  const domain = extractDomain(url);
  const profiles = await prisma.projectProfile.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  const matched =
    profiles.find((profile) => profile.domain === domain) ||
    profiles.find((profile) => profile.isDefault) ||
    profiles[0];

  return matched ? mapProjectProfile(matched) : null;
}

export async function resolveRelevantProjectProfile(userId: string, text: string) {
  const profiles = await prisma.projectProfile.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  if (profiles.length === 0) {
    return null;
  }

  const normalized = text.toLowerCase();
  const matched =
    profiles.find(
      (profile) =>
        normalized.includes(profile.domain.toLowerCase()) ||
        normalized.includes(profile.websiteUrl.toLowerCase()) ||
        normalized.includes(profile.name.toLowerCase())
    ) ||
    profiles.find((profile) => profile.isDefault) ||
    (profiles.length === 1 ? profiles[0] : null);

  return matched ? mapProjectProfile(matched) : null;
}
