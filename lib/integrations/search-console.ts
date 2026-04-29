import { getGoogleAccessToken } from "@/lib/integrations/google-auth";

const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const SEARCH_CONSOLE_DAYS = 28;

export interface SearchConsoleRow {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleSnapshot {
  configured: boolean;
  siteUrl: string;
  periodDays: number;
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    averagePosition: number;
  };
  previousTotals: {
    clicks: number;
    impressions: number;
    ctr: number;
    averagePosition: number;
  };
  deltas: {
    clicksPct: number | null;
    impressionsPct: number | null;
    ctrDelta: number | null;
    averagePositionDelta: number | null;
  };
  topQueries: SearchConsoleRow[];
  topPages: SearchConsoleRow[];
}

type SearchAnalyticsResponse = {
  rows?: Array<{
    keys?: string[];
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
  }>;
};

type SearchAnalyticsRow = NonNullable<SearchAnalyticsResponse["rows"]>[number];

function getDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDateRange(days: number, offsetDays = 0) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() - 1 - offsetDays);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);

  return {
    startDate: getDateString(start),
    endDate: getDateString(end),
  };
}

function toRow(row: SearchAnalyticsRow): SearchConsoleRow {
  return {
    key: row.keys?.[0] || "Unknown",
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0),
  };
}

function toTotals(response: SearchAnalyticsResponse) {
  const first = response.rows?.[0];
  return {
    clicks: Number(first?.clicks || 0),
    impressions: Number(first?.impressions || 0),
    ctr: Number(first?.ctr || 0),
    averagePosition: Number(first?.position || 0),
  };
}

function percentageChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

async function querySearchAnalytics(siteUrl: string, body: Record<string, unknown>) {
  const token = await getGoogleAccessToken([SEARCH_CONSOLE_SCOPE]);
  if (!token) {
    throw new Error("Google service account is not configured.");
  }

  const response = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    }
  );

  if (!response.ok) {
    throw new Error(`Search Console API returned ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as SearchAnalyticsResponse;
}

export async function fetchSearchConsoleSnapshot(siteUrl: string): Promise<SearchConsoleSnapshot> {
  const currentRange = getDateRange(SEARCH_CONSOLE_DAYS);
  const previousRange = getDateRange(SEARCH_CONSOLE_DAYS, SEARCH_CONSOLE_DAYS);

  const [currentTotals, previousTotals, topQueries, topPages] = await Promise.all([
    querySearchAnalytics(siteUrl, {
      ...currentRange,
      rowLimit: 1,
      aggregationType: "auto",
    }),
    querySearchAnalytics(siteUrl, {
      ...previousRange,
      rowLimit: 1,
      aggregationType: "auto",
    }),
    querySearchAnalytics(siteUrl, {
      ...currentRange,
      dimensions: ["query"],
      rowLimit: 5,
      aggregationType: "auto",
    }),
    querySearchAnalytics(siteUrl, {
      ...currentRange,
      dimensions: ["page"],
      rowLimit: 5,
      aggregationType: "auto",
    }),
  ]);

  const current = toTotals(currentTotals);
  const previous = toTotals(previousTotals);

  return {
    configured: true,
    siteUrl,
    periodDays: SEARCH_CONSOLE_DAYS,
    totals: current,
    previousTotals: previous,
    deltas: {
      clicksPct: percentageChange(current.clicks, previous.clicks),
      impressionsPct: percentageChange(current.impressions, previous.impressions),
      ctrDelta: Number(((current.ctr - previous.ctr) * 100).toFixed(2)),
      averagePositionDelta: Number((previous.averagePosition - current.averagePosition).toFixed(2)),
    },
    topQueries: (topQueries.rows || []).map(toRow),
    topPages: (topPages.rows || []).map(toRow),
  };
}
