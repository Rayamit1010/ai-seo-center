import { prisma } from "@/lib/db";
import { DEFAULT_PIPELINE_CONFIG } from "@/lib/agent/constants";
import { parseStoredJson } from "@/lib/server/response";

type CampaignPatch = {
  name?: string;
  status?: "active" | "paused" | "completed";
};

export async function listCampaigns(userId: string, limit = 50, cursor?: string) {
  const campaigns = await prisma.backlinkCampaign.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { _count: { select: { prospects: true } } },
  });

  const hasMore = campaigns.length > limit;
  const rows = hasMore ? campaigns.slice(0, limit) : campaigns;
  return {
    rows: rows.map((campaign) => ({
      ...campaign,
      competitorUrls: parseStoredJson(campaign.competitorUrls, [] as string[]),
      config: parseStoredJson(campaign.config, DEFAULT_PIPELINE_CONFIG),
      prospectCount: campaign._count.prospects,
    })),
    nextCursor: hasMore ? rows[rows.length - 1].id : null,
    hasMore,
  };
}

export async function createCampaign(params: {
  userId: string;
  name: string;
  targetUrl: string;
  industry: string;
  targetCountry: string;
  competitorUrls?: string[];
}) {
  return prisma.backlinkCampaign.create({
    data: {
      userId: params.userId,
      name: params.name,
      targetUrl: params.targetUrl,
      industry: params.industry,
      targetCountry: params.targetCountry,
      competitorUrls: params.competitorUrls
        ? JSON.stringify(params.competitorUrls)
        : null,
      config: JSON.stringify(DEFAULT_PIPELINE_CONFIG),
      status: "active",
    },
  });
}

export async function getCampaignDetails(userId: string, id: string) {
  const campaign = await prisma.backlinkCampaign.findFirst({
    where: { id, userId },
    include: {
      prospects: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      agentRuns: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!campaign) {
    return null;
  }

  return {
    ...campaign,
    competitorUrls: parseStoredJson(campaign.competitorUrls, [] as string[]),
    config: parseStoredJson(campaign.config, DEFAULT_PIPELINE_CONFIG),
    prospects: campaign.prospects.map((prospect) => ({
      ...prospect,
      qualifyData: parseStoredJson(prospect.qualifyData, null),
      contactData: parseStoredJson(prospect.contactData, null),
      discoveryData: parseStoredJson(prospect.discoveryData, null),
    })),
    agentRuns: campaign.agentRuns.map((run) => ({
      ...run,
      log: parseStoredJson(run.log, []),
    })),
  };
}

export async function updateCampaign(
  userId: string,
  id: string,
  patch: CampaignPatch
) {
  const campaign = await prisma.backlinkCampaign.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!campaign) {
    return null;
  }

  return prisma.backlinkCampaign.update({
    where: { id },
    data: {
      ...(patch.name ? { name: patch.name } : {}),
      ...(patch.status ? { status: patch.status } : {}),
    },
  });
}

export async function deleteCampaign(userId: string, id: string) {
  const campaign = await prisma.backlinkCampaign.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!campaign) {
    return null;
  }

  await prisma.$transaction([
    prisma.emailQueue.deleteMany({
      where: {
        prospect: {
          campaignId: id,
        },
      },
    }),
    prisma.backlinkProspect.deleteMany({
      where: { campaignId: id },
    }),
    prisma.agentRun.deleteMany({
      where: { campaignId: id },
    }),
    prisma.backlinkCampaign.delete({
      where: { id },
    }),
  ]);

  return campaign;
}
