import assert from "node:assert/strict";
import test from "node:test";
import { buildExternalDataContext, type ExternalDataSnapshot } from "../lib/services/external-data-service";
import { buildReportDocument, parseReportContent } from "../lib/reports";

const externalData: ExternalDataSnapshot = {
  projectId: "project_123",
  projectName: "TechGeek Studio",
  fetchedAt: "2026-04-08T12:00:00.000Z",
  sources: ["search_console", "ga4"],
  warnings: [],
  summaryLines: [
    "Search Console (28d): 320 clicks (+12%), 12000 impressions (+8%), CTR 2.40%, average position 13.4.",
    "GA4 (28d): 1450 sessions (+10%), 1180 users (+8%), 42 conversions (+14%).",
  ],
  searchConsole: {
    configured: true,
    siteUrl: "https://techgeekstudio.com/",
    periodDays: 28,
    totals: {
      clicks: 320,
      impressions: 12000,
      ctr: 0.024,
      averagePosition: 13.4,
    },
    previousTotals: {
      clicks: 285,
      impressions: 11100,
      ctr: 0.022,
      averagePosition: 14.1,
    },
    deltas: {
      clicksPct: 12.3,
      impressionsPct: 8.1,
      ctrDelta: 0.2,
      averagePositionDelta: 0.7,
    },
    topQueries: [
      {
        key: "ai seo agency",
        clicks: 50,
        impressions: 300,
        ctr: 0.16,
        position: 5.1,
      },
    ],
    topPages: [
      {
        key: "https://techgeekstudio.com/seo-agent",
        clicks: 40,
        impressions: 180,
        ctr: 0.22,
        position: 4.8,
      },
    ],
  },
  ga4: {
    configured: true,
    propertyId: "123456789",
    periodDays: 28,
    totals: {
      sessions: 1450,
      users: 1180,
      pageViews: 3200,
      conversions: 42,
    },
    previousTotals: {
      sessions: 1320,
      users: 1090,
      pageViews: 2950,
      conversions: 37,
    },
    deltas: {
      sessionsPct: 9.8,
      usersPct: 8.3,
      pageViewsPct: 8.5,
      conversionsPct: 13.5,
    },
    topChannels: [
      {
        label: "Organic Search",
        sessions: 900,
        conversions: 29,
      },
    ],
    topPages: [
      {
        label: "/seo-agent",
        sessions: 420,
        conversions: 14,
      },
    ],
  },
};

test("buildReportDocument preserves external performance data", () => {
  const report = buildReportDocument(
    {
      id: "audit_123",
      url: "https://techgeekstudio.com",
      title: "TechGeek Studio",
      summary: "The site has strong momentum but still needs technical cleanup.",
      createdAt: "2026-04-08T12:00:00.000Z",
      scores: {
        overall: 78,
        onpage: 74,
        technical: 69,
        offpage: 80,
        keywords: 76,
      },
      onPage: { wins: ["Improved title coverage"] } as never,
      technical: {
        wins: ["Schema coverage improved"],
        issues: ["Reduce render-blocking resources"],
        schema: { recommendations: [] },
        coreWebVitals: {
          lcp: { fix: "Compress hero assets" },
          cls: { fix: "Reserve image space" },
          fid: { fix: "Reduce third-party JS" },
        },
      } as never,
      offPage: {
        backlinkStrategy: { priorityActions: ["Pitch two resource pages"], quickWins: [], authorityTactics: [] },
      } as never,
      keywords: {
        primary: [{ keyword: "ai seo agency", intent: "commercial", priority: "high" }],
        competitorGaps: [],
        contentIdeas: [],
      } as never,
      checklist: {
        critical: [{ action: "Fix LCP on the homepage", module: "technical", impact: "high", effort: "medium" }],
        high: [],
        medium: [],
      } as never,
    },
    {
      clientName: "Ray",
      projectName: "TechGeek Studio",
      recipientEmail: "ray@example.com",
      externalData,
    }
  );

  assert.equal(report.externalData?.ga4?.totals.sessions, 1450);
  assert.ok(report.headlineMetrics.some((metric) => metric.label === "Search clicks"));
  assert.ok(report.charts.some((chart) => chart.label === "Sessions"));
  assert.match(report.plainSummary, /Search Console shows 320 clicks/);
});

test("parseReportContent keeps external data available after persistence", () => {
  const document = buildReportDocument(
    {
      id: "audit_456",
      url: "https://techgeekstudio.com",
      title: "TechGeek Studio",
      summary: null,
      createdAt: "2026-04-08T12:00:00.000Z",
      scores: null,
      onPage: null,
      technical: null,
      offPage: null,
      keywords: null,
      checklist: null,
    },
    { externalData }
  );

  const parsed = parseReportContent(JSON.stringify(document));
  assert.equal(parsed?.externalData?.searchConsole?.siteUrl, "https://techgeekstudio.com/");
});

test("buildExternalDataContext summarizes integrated data for prompts", () => {
  const context = buildExternalDataContext(externalData);

  assert.match(context, /External performance data:/);
  assert.match(context, /Top Search Console queries/);
  assert.match(context, /Top GA4 pages/);
});
