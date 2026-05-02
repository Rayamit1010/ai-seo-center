export interface SerpResult {
  position: number | null;
  url: string | null;
  title: string | null;
}

interface OrganicResult {
  position: number;
  link: string;
  title: string;
}

interface SerpApiResponse {
  organic_results?: OrganicResult[];
}

const COUNTRY_GL: Record<string, string> = {
  IN: "in",
  US: "us",
  GB: "gb",
  AU: "au",
  CA: "ca",
};

interface CacheEntry {
  result: SerpResult;
  expiresAt: number;
}

const serpCache = new Map<string, CacheEntry>();

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function getCacheKey(keyword: string, targetDomain: string, country: string): string {
  return `${keyword}::${targetDomain}::${country}`;
}

function getCached(key: string): SerpResult | null {
  const entry = serpCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    serpCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(key: string, result: SerpResult): void {
  serpCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function checkSingleRank(
  keyword: string,
  targetDomain: string,
  country: string
): Promise<SerpResult> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    return { position: null, url: null, title: null };
  }

  const cacheKey = getCacheKey(keyword, targetDomain, country);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const gl = COUNTRY_GL[country.toUpperCase()] ?? "in";
  const params = new URLSearchParams({
    q: keyword,
    gl,
    hl: "en",
    num: "100",
    api_key: apiKey,
  });

  const response = await fetch(`https://serpapi.com/search?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("SerpAPI error:", response.status);
    return { position: null, url: null, title: null };
  }

  const data = (await response.json()) as SerpApiResponse;
  const organicResults = data.organic_results ?? [];

  let result: SerpResult = { position: null, url: null, title: null };

  for (const item of organicResults) {
    if (item.link?.includes(targetDomain)) {
      result = {
        position: item.position,
        url: item.link,
        title: item.title,
      };
      break;
    }
  }

  setCache(cacheKey, result);
  return result;
}
