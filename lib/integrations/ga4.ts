import { getGoogleAccessToken } from "@/lib/integrations/google-auth";

const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const GA4_DAYS = 28;

export interface Ga4SummaryTotals {
  sessions: number;
  users: number;
  pageViews: number;
  conversions: number;
}

export interface Ga4BreakdownRow {
  label: string;
  sessions: number;
  conversions: number;
}

export interface Ga4Snapshot {
  configured: boolean;
  propertyId: string;
  periodDays: number;
  totals: Ga4SummaryTotals;
  previousTotals: Ga4SummaryTotals;
  deltas: {
    sessionsPct: number | null;
    usersPct: number | null;
    pageViewsPct: number | null;
    conversionsPct: number | null;
  };
  topChannels: Ga4BreakdownRow[];
  topPages: Ga4BreakdownRow[];
}

type RunReportResponse = {
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
};

function percentageChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

async function runGa4Report(propertyId: string, body: Record<string, unknown>) {
  const token = await getGoogleAccessToken([GA4_SCOPE]);
  if (!token) {
    throw new Error("Google service account is not configured.");
  }

  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
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
    throw new Error(`GA4 Data API returned ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as RunReportResponse;
}

function toNumber(value: string | undefined) {
  return Number(value || 0);
}

function toSummaryTotals(response: RunReportResponse): Ga4SummaryTotals {
  const first = response.rows?.[0];
  return {
    sessions: toNumber(first?.metricValues?.[0]?.value),
    users: toNumber(first?.metricValues?.[1]?.value),
    pageViews: toNumber(first?.metricValues?.[2]?.value),
    conversions: toNumber(first?.metricValues?.[3]?.value),
  };
}

function toBreakdownRows(response: RunReportResponse): Ga4BreakdownRow[] {
  return (response.rows || []).map((row) => ({
    label: row.dimensionValues?.[0]?.value || "Unknown",
    sessions: toNumber(row.metricValues?.[0]?.value),
    conversions: toNumber(row.metricValues?.[1]?.value),
  }));
}

export async function fetchGa4Snapshot(propertyId: string): Promise<Ga4Snapshot> {
  const [currentTotals, previousTotals, topChannels, topPages] = await Promise.all([
    runGa4Report(propertyId, {
      dateRanges: [{ startDate: `${GA4_DAYS}daysAgo`, endDate: "yesterday" }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "screenPageViews" },
        { name: "conversions" },
      ],
    }),
    runGa4Report(propertyId, {
      dateRanges: [{ startDate: `${GA4_DAYS * 2}daysAgo`, endDate: `${GA4_DAYS + 1}daysAgo` }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "screenPageViews" },
        { name: "conversions" },
      ],
    }),
    runGa4Report(propertyId, {
      dateRanges: [{ startDate: `${GA4_DAYS}daysAgo`, endDate: "yesterday" }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }, { name: "conversions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 5,
    }),
    runGa4Report(propertyId, {
      dateRanges: [{ startDate: `${GA4_DAYS}daysAgo`, endDate: "yesterday" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "sessions" }, { name: "conversions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 5,
    }),
  ]);

  const current = toSummaryTotals(currentTotals);
  const previous = toSummaryTotals(previousTotals);

  return {
    configured: true,
    propertyId,
    periodDays: GA4_DAYS,
    totals: current,
    previousTotals: previous,
    deltas: {
      sessionsPct: percentageChange(current.sessions, previous.sessions),
      usersPct: percentageChange(current.users, previous.users),
      pageViewsPct: percentageChange(current.pageViews, previous.pageViews),
      conversionsPct: percentageChange(current.conversions, previous.conversions),
    },
    topChannels: toBreakdownRows(topChannels),
    topPages: toBreakdownRows(topPages),
  };
}
