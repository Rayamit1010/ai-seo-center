import type {
  PageSpeedResult,
  PageSpeedData,
  CoreWebVital,
  PageSpeedOpportunity,
  PageSpeedDiagnostic,
} from "@/types";

const PAGESPEED_API =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/** Fetch PageSpeed data for both mobile and desktop */
export async function getPageSpeedData(url: string): Promise<PageSpeedData> {
  const [mobile, desktop] = await Promise.all([
    fetchPageSpeed(url, "mobile"),
    fetchPageSpeed(url, "desktop"),
  ]);

  return { mobile, desktop };
}

/** Fetch PageSpeed Insights for a single strategy */
async function fetchPageSpeed(
  url: string,
  strategy: "mobile" | "desktop"
): Promise<PageSpeedResult> {
  const apiKey = process.env.PAGESPEED_API_KEY;
  let apiUrl = `${PAGESPEED_API}?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance`;

  if (apiKey) {
    apiUrl += `&key=${apiKey}`;
  }

  const response = await fetch(apiUrl, {
    signal: AbortSignal.timeout(60000), // PageSpeed can be slow
  });

  if (!response.ok) {
    throw new Error(
      `PageSpeed API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  const lighthouse = data.lighthouseResult;
  if (!lighthouse) {
    throw new Error("No Lighthouse data in PageSpeed response");
  }

  const audits = lighthouse.audits || {};
  const categories = lighthouse.categories || {};

  // Performance score
  const performanceScore = Math.round(
    (categories.performance?.score ?? 0) * 100
  );

  // Core Web Vitals
  const lcp = extractMetric(audits, "largest-contentful-paint");
  const fid = extractMetric(audits, "max-potential-fid");
  const cls = extractMetric(audits, "cumulative-layout-shift");
  const fcp = extractMetric(audits, "first-contentful-paint");
  const ttfb = extractMetric(audits, "server-response-time");
  const speedIndex = extractMetric(audits, "speed-index");

  // Opportunities (top 5)
  const opportunities: PageSpeedOpportunity[] = [];
  const opportunityAudits = Object.values(audits) as Array<Record<string, unknown>>;
  for (const audit of opportunityAudits) {
    if (
      audit.details &&
      (audit.details as Record<string, unknown>).type === "opportunity" &&
      typeof audit.score === "number" &&
      audit.score < 1
    ) {
      opportunities.push({
        title: audit.title as string,
        description: (audit.description as string) || "",
        savings: (audit.displayValue as string) || "N/A",
      });
    }
    if (opportunities.length >= 5) break;
  }

  // Diagnostics (top 5)
  const diagnostics: PageSpeedDiagnostic[] = [];
  for (const audit of opportunityAudits) {
    if (
      audit.details &&
      (audit.details as Record<string, unknown>).type === "table" &&
      typeof audit.score === "number" &&
      audit.score < 1
    ) {
      diagnostics.push({
        title: audit.title as string,
        description: (audit.description as string) || "",
      });
    }
    if (diagnostics.length >= 5) break;
  }

  return {
    strategy,
    performanceScore,
    lcp,
    fid,
    cls,
    fcp,
    ttfb,
    speedIndex,
    opportunities,
    diagnostics,
  };
}

/** Extract a metric from Lighthouse audits */
function extractMetric(
  audits: Record<string, Record<string, unknown>>,
  auditId: string
): CoreWebVital {
  const audit = audits[auditId];
  if (!audit) {
    return { value: "N/A", score: 0, status: "poor" };
  }

  const score = typeof audit.score === "number" ? audit.score : 0;
  const displayValue =
    typeof audit.displayValue === "string"
      ? audit.displayValue
      : typeof audit.numericValue === "number"
        ? `${Math.round(audit.numericValue as number)} ms`
        : "N/A";

  let status: "good" | "needs_improvement" | "poor";
  if (score >= 0.9) {
    status = "good";
  } else if (score >= 0.5) {
    status = "needs_improvement";
  } else {
    status = "poor";
  }

  return { value: displayValue, score: Math.round(score * 100), status };
}
