import { fetchGa4Snapshot, type Ga4Snapshot } from "@/lib/integrations/ga4";
import {
  fetchSearchConsoleSnapshot,
  type SearchConsoleSnapshot,
} from "@/lib/integrations/search-console";
import { isGoogleServiceAccountConfigured } from "@/lib/integrations/google-auth";
import type { ProjectProfileRecord } from "@/lib/services/project-profile-service";

const SNAPSHOT_TTL_MS = 5 * 60 * 1000;

export interface ExternalDataSnapshot {
  projectId: string;
  projectName: string;
  fetchedAt: string;
  sources: Array<"search_console" | "ga4">;
  warnings: string[];
  summaryLines: string[];
  searchConsole: SearchConsoleSnapshot | null;
  ga4: Ga4Snapshot | null;
}

const globalForExternalData = globalThis as unknown as {
  externalDataCache?: Map<string, { expiresAt: number; snapshot: ExternalDataSnapshot }>;
};

const externalDataCache = globalForExternalData.externalDataCache ?? new Map<string, { expiresAt: number; snapshot: ExternalDataSnapshot }>();

if (process.env.NODE_ENV !== "production") {
  globalForExternalData.externalDataCache = externalDataCache;
}

function formatPct(value: number | null, suffix = "%") {
  if (value === null) return "n/a";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${suffix}`;
}

function formatCtr(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function buildSummaryLines(searchConsole: SearchConsoleSnapshot | null, ga4: Ga4Snapshot | null) {
  const lines: string[] = [];

  if (searchConsole) {
    lines.push(
      `Search Console (${searchConsole.periodDays}d): ${searchConsole.totals.clicks} clicks (${formatPct(
        searchConsole.deltas.clicksPct
      )}), ${searchConsole.totals.impressions} impressions (${formatPct(
        searchConsole.deltas.impressionsPct
      )}), CTR ${formatCtr(searchConsole.totals.ctr)}, average position ${searchConsole.totals.averagePosition.toFixed(1)}.`
    );
  }

  if (ga4) {
    lines.push(
      `GA4 (${ga4.periodDays}d): ${ga4.totals.sessions} sessions (${formatPct(
        ga4.deltas.sessionsPct
      )}), ${ga4.totals.users} users (${formatPct(ga4.deltas.usersPct)}), ${ga4.totals.conversions} conversions (${formatPct(
        ga4.deltas.conversionsPct
      )}).`
    );
  }

  return lines;
}

function getSnapshotCacheKey(profile: ProjectProfileRecord) {
  return [
    profile.id,
    profile.updatedAt.toISOString?.() || String(profile.updatedAt),
    profile.searchConsoleSiteUrl || "",
    profile.ga4PropertyId || "",
  ].join(":");
}

export async function getExternalDataSnapshot(profile: ProjectProfileRecord | null | undefined) {
  if (!profile) {
    return null;
  }

  const hasGoogleTarget = Boolean(profile.searchConsoleSiteUrl || profile.ga4PropertyId);
  if (!hasGoogleTarget) {
    return null;
  }

  const cacheKey = getSnapshotCacheKey(profile);
  const cached = externalDataCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.snapshot;
  }

  const warnings: string[] = [];
  if (!isGoogleServiceAccountConfigured()) {
    warnings.push("Google service account credentials are not configured yet.");
  }

  const [searchConsoleResult, ga4Result] = await Promise.all([
    profile.searchConsoleSiteUrl
      ? fetchSearchConsoleSnapshot(profile.searchConsoleSiteUrl).catch((error) => {
          warnings.push(error instanceof Error ? error.message : "Search Console data could not be loaded.");
          return null;
        })
      : Promise.resolve(null),
    profile.ga4PropertyId
      ? fetchGa4Snapshot(profile.ga4PropertyId).catch((error) => {
          warnings.push(error instanceof Error ? error.message : "GA4 data could not be loaded.");
          return null;
        })
      : Promise.resolve(null),
  ]);

  const snapshot: ExternalDataSnapshot = {
    projectId: profile.id,
    projectName: profile.name,
    fetchedAt: new Date().toISOString(),
    sources: [
      ...(searchConsoleResult ? (["search_console"] as const) : []),
      ...(ga4Result ? (["ga4"] as const) : []),
    ],
    warnings,
    summaryLines: buildSummaryLines(searchConsoleResult, ga4Result),
    searchConsole: searchConsoleResult,
    ga4: ga4Result,
  };

  externalDataCache.set(cacheKey, {
    expiresAt: Date.now() + SNAPSHOT_TTL_MS,
    snapshot,
  });

  return snapshot;
}

export function buildExternalDataContext(snapshot: ExternalDataSnapshot | null | undefined) {
  if (!snapshot) {
    return "";
  }

  const lines = [...snapshot.summaryLines];

  if (snapshot.searchConsole?.topQueries.length) {
    lines.push(
      `Top Search Console queries: ${snapshot.searchConsole.topQueries
        .map((item) => `${item.key} (${item.clicks} clicks, ${formatCtr(item.ctr)})`)
        .join("; ")}`
    );
  }

  if (snapshot.ga4?.topPages.length) {
    lines.push(
      `Top GA4 pages: ${snapshot.ga4.topPages
        .map((item) => `${item.label} (${item.sessions} sessions, ${item.conversions} conversions)`)
        .join("; ")}`
    );
  }

  if (snapshot.warnings.length) {
    lines.push(`Integration warnings: ${snapshot.warnings.join(" | ")}`);
  }

  return lines.length > 0 ? `External performance data:\n${lines.join("\n")}` : "";
}
