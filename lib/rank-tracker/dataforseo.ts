import { prisma } from "@/lib/db";

export interface RankCheckInput {
  keyword: string;
  targetDomain: string;
  country: string;
  device: string;
}

export interface RankCheckResult {
  keyword: string;
  targetDomain: string;
  position: number | null;
  url: string | null;
  title: string | null;
  featured: boolean;
}

interface DataForSeoItem {
  type: string;
  rank_absolute: number;
  url: string;
  title: string;
  featured_snippet?: boolean;
}

interface DataForSeoTaskResult {
  items?: DataForSeoItem[];
}

interface DataForSeoResult {
  result?: DataForSeoTaskResult[];
}

interface DataForSeoTask {
  id: string;
  status_code: number;
  result?: DataForSeoResult[];
}

interface DataForSeoResponse {
  tasks?: DataForSeoTask[];
}

const COUNTRY_CODES: Record<string, number> = {
  IN: 2356,
  US: 2840,
  GB: 2826,
  AU: 2036,
  CA: 2124,
};

function countryToCode(country: string): number {
  return COUNTRY_CODES[country.toUpperCase()] ?? 2356;
}

function getBasicAuthHeader(): string | null {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
}

export async function checkRankings(keywords: RankCheckInput[]): Promise<RankCheckResult[]> {
  const authHeader = getBasicAuthHeader();
  if (!authHeader) {
    return [];
  }

  const tasks = keywords.map((kw) => ({
    keyword: kw.keyword,
    location_code: countryToCode(kw.country),
    device: kw.device,
    language_code: "en",
    depth: 100,
  }));

  const response = await fetch(
    "https://api.dataforseo.com/v3/serp/google/organic/live/regular",
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tasks),
    }
  );

  if (!response.ok) {
    console.error("DataForSEO API error:", response.status, await response.text());
    return [];
  }

  const data = (await response.json()) as DataForSeoResponse;

  const results: RankCheckResult[] = [];

  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i];
    const task = data.tasks?.[i];
    const taskResult = task?.result?.[0]?.result?.[0];
    const items = taskResult?.items ?? [];

    let position: number | null = null;
    let url: string | null = null;
    let title: string | null = null;
    let featured = false;

    for (const item of items) {
      if (item.type === "organic" && item.url?.includes(kw.targetDomain)) {
        position = item.rank_absolute;
        url = item.url;
        title = item.title;
        featured = item.featured_snippet === true;
        break;
      }
    }

    results.push({
      keyword: kw.keyword,
      targetDomain: kw.targetDomain,
      position,
      url,
      title,
      featured,
    });
  }

  return results;
}

export async function bulkCheckRankings(keywordIds: string[]): Promise<void> {
  const keywords = await prisma.trackedKeyword.findMany({
    where: { id: { in: keywordIds }, isActive: true },
    include: {
      rankHistory: {
        orderBy: { checkedAt: "desc" },
        take: 1,
      },
    },
  });

  if (keywords.length === 0) return;

  const BATCH_SIZE = 50;

  for (let offset = 0; offset < keywords.length; offset += BATCH_SIZE) {
    const batch = keywords.slice(offset, offset + BATCH_SIZE);

    const inputs: RankCheckInput[] = batch.map((kw) => ({
      keyword: kw.keyword,
      targetDomain: kw.targetDomain,
      country: kw.country,
      device: kw.device,
    }));

    const results = await checkRankings(inputs);

    const now = new Date();

    for (let i = 0; i < batch.length; i++) {
      const kw = batch[i];
      const result = results[i];
      const latestHistory = kw.rankHistory[0];
      const previousPos = latestHistory?.position ?? null;
      const newPos = result?.position ?? null;
      const change =
        previousPos !== null && newPos !== null ? previousPos - newPos : null;

      await prisma.rankHistory.create({
        data: {
          keywordId: kw.id,
          checkedAt: now,
          position: newPos,
          previousPos,
          change,
          url: result?.url ?? null,
          title: result?.title ?? null,
          featured: result?.featured ?? false,
          device: kw.device,
        },
      });

      await prisma.trackedKeyword.update({
        where: { id: kw.id },
        data: { lastCheckedAt: now },
      });
    }
  }
}
