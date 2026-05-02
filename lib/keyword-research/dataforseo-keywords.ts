export interface KeywordData {
  keyword: string;
  searchVolume: number | null;
  cpc: number | null;
  competition: number | null; // 0-1
  trend: number[]; // monthly volumes last 12 months
}

export interface KeywordGapResult {
  keyword: string;
  competitorPosition: number;
  estimatedVolume: number;
}

const COUNTRY_CODES: Record<string, number> = {
  IN: 2356,
  US: 2840,
  GB: 2826,
  AU: 2036,
  CA: 2124,
};

function getAuthHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return "";
  return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
}

function hasApiKeys(): boolean {
  return Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

function parseKeywordItem(item: Record<string, unknown>): KeywordData {
  const monthlySearches = item.monthly_searches;
  const trend: number[] = [];
  if (Array.isArray(monthlySearches)) {
    for (const entry of monthlySearches as Array<Record<string, unknown>>) {
      if (typeof entry.search_volume === "number") {
        trend.push(entry.search_volume);
      }
    }
  }

  return {
    keyword: typeof item.keyword === "string" ? item.keyword : String(item.keyword ?? ""),
    searchVolume: typeof item.search_volume === "number" ? item.search_volume : null,
    cpc: typeof item.cpc === "number" ? item.cpc : null,
    competition: typeof item.competition === "number" ? item.competition : null,
    trend,
  };
}

export async function getKeywordSuggestions(
  seed: string,
  country: string
): Promise<KeywordData[]> {
  if (!hasApiKeys()) return [];

  const locationCode = COUNTRY_CODES[country] ?? COUNTRY_CODES["IN"];
  const authHeader = getAuthHeader();

  try {
    const response = await fetch(
      "https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify([
          {
            keywords: [seed],
            location_code: locationCode,
            language_code: "en",
            limit: 50,
          },
        ]),
        signal: AbortSignal.timeout(30_000),
      }
    );

    if (!response.ok) {
      console.error(`DataForSEO suggestions error: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as {
      tasks?: Array<{
        result?: Array<{
          items?: Array<Record<string, unknown>>;
        }>;
      }>;
    };

    const items = data.tasks?.[0]?.result?.[0]?.items ?? [];
    return items.map(parseKeywordItem);
  } catch (error) {
    console.error("DataForSEO getKeywordSuggestions error:", error);
    return [];
  }
}

export async function getKeywordVolume(
  keywords: string[],
  country: string
): Promise<KeywordData[]> {
  if (!hasApiKeys()) return [];

  const locationCode = COUNTRY_CODES[country] ?? COUNTRY_CODES["IN"];
  const authHeader = getAuthHeader();

  // Batch max 100 keywords
  const batch = keywords.slice(0, 100);

  try {
    const response = await fetch(
      "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify([
          {
            keywords: batch,
            location_code: locationCode,
            language_code: "en",
          },
        ]),
        signal: AbortSignal.timeout(30_000),
      }
    );

    if (!response.ok) {
      console.error(`DataForSEO volume error: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as {
      tasks?: Array<{
        result?: Array<Record<string, unknown>>;
      }>;
    };

    const items = data.tasks?.[0]?.result ?? [];
    return items.map(parseKeywordItem);
  } catch (error) {
    console.error("DataForSEO getKeywordVolume error:", error);
    return [];
  }
}

export async function getKeywordGap(
  _domain1: string,
  _domain2: string,
  _country: string
): Promise<KeywordGapResult[]> {
  // Simplified implementation — returns empty if no API key
  // A full implementation would use DataForSEO's domain intersection endpoints
  if (!hasApiKeys()) return [];
  return [];
}
