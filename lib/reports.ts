import type {
  AuditChecklist,
  AuditScores,
  KeywordsAnalysis,
  OffPageAnalysis,
  OnPageAnalysis,
  TechnicalAnalysis,
} from "@/types";
import type { ExternalDataSnapshot } from "@/lib/services/external-data-service";
import { extractDomain, safeJsonParse } from "@/lib/utils";

type ScoreTone = "strong" | "watch" | "critical";
type Impact = "high" | "medium" | "low";
type Effort = "high" | "medium" | "low";

export interface ReportMetric {
  label: string;
  value: string;
  tone: ScoreTone;
  note: string;
}

export interface ReportActionItem {
  title: string;
  detail: string;
  module: "onpage" | "technical" | "offpage" | "keywords";
  impact: Impact;
  effort: Effort;
}

export interface ReportDocument {
  version: 2;
  title: string;
  type: string;
  status: "draft" | "ready_to_send" | "sent";
  clientName: string;
  projectName: string;
  recipientEmail: string;
  domain: string;
  generatedAt: string;
  generatedFromAuditId: string | null;
  executiveSummary: string;
  plainSummary: string;
  clientSummary: string;
  scorecard: AuditScores;
  headlineMetrics: ReportMetric[];
  scoreDeltas: Array<{
    label: string;
    current: number;
    previous: number | null;
    change: number | null;
  }>;
  keyWins: string[];
  keyRisks: string[];
  priorityActions: ReportActionItem[];
  roadmap30Days: string[];
  keywordOpportunities: string[];
  backlinkOpportunities: string[];
  technicalFocus: string[];
  highlights: string[];
  externalData: ExternalDataSnapshot | null;
  charts: Array<{
    label: string;
    current: number;
    previous: number | null;
  }>;
  branding: {
    accent: string;
    agencyLabel: string;
    footerNote: string;
  };
  delivery: {
    lastUpdatedAt: string;
    sentAt: string | null;
  };
  emailSubject: string;
  emailBody: string;
}

export interface AuditReportSource {
  id: string;
  url: string;
  title: string | null;
  summary: string | null;
  createdAt: string | Date;
  scores: AuditScores | null;
  onPage: OnPageAnalysis | null;
  technical: TechnicalAnalysis | null;
  offPage: OffPageAnalysis | null;
  keywords: KeywordsAnalysis | null;
  checklist: AuditChecklist | null;
}

export interface ReportBuildOptions {
  clientName?: string;
  projectName?: string;
  recipientEmail?: string;
  title?: string;
  status?: "draft" | "ready_to_send" | "sent";
  sentAt?: string | null;
  branding?: Partial<ReportDocument["branding"]>;
  previousAudit?: Pick<AuditReportSource, "scores" | "createdAt" | "title"> | null;
  externalData?: ExternalDataSnapshot | null;
}

const EMPTY_SCORES: AuditScores = {
  overall: 0,
  onpage: 0,
  technical: 0,
  offpage: 0,
  keywords: 0,
};

function toneFromScore(score: number): ScoreTone {
  if (score >= 80) return "strong";
  if (score >= 60) return "watch";
  return "critical";
}

function labelFromScore(score: number): string {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Promising";
  if (score >= 50) return "Needs focus";
  return "Urgent";
}

function firstItems(items: string[] | undefined, limit: number, fallback: string[] = []) {
  return (items ?? []).filter(Boolean).slice(0, limit).length > 0
    ? (items ?? []).filter(Boolean).slice(0, limit)
    : fallback;
}

function compactStrings(items: Array<string | undefined | null>) {
  return items.filter((item): item is string => Boolean(item));
}

function formatSignedPercent(value: number | null) {
  if (value === null) return "flat";
  if (value === 0) return "flat";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function formatMetricValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildReportDocument(
  audit: AuditReportSource,
  options: ReportBuildOptions = {}
): ReportDocument {
  const domain = extractDomain(audit.url);
  const scorecard = audit.scores ?? EMPTY_SCORES;
  const createdAt = new Date(audit.createdAt).toISOString();
  const clientName = options.clientName?.trim() || "Your Client";
  const projectName = options.projectName?.trim() || audit.title?.trim() || domain;
  const recipientEmail = options.recipientEmail?.trim() || "";
  const previousScores = options.previousAudit?.scores ?? null;
  const externalData = options.externalData || null;
  const wins = [
    ...(audit.onPage?.wins ?? []),
    ...(audit.technical?.wins ?? []),
  ].filter(Boolean);
  const risks = [
    ...(audit.checklist?.critical ?? []),
    ...(audit.checklist?.high ?? []),
  ].map((item) => item.action);
  const priorityActions = [
    ...(audit.checklist?.critical ?? []),
    ...(audit.checklist?.high ?? []),
    ...(audit.checklist?.medium ?? []),
  ]
    .slice(0, 6)
    .map((item) => ({
      title: item.action,
      detail: `${item.module.toUpperCase()} improvement with ${item.impact} impact and ${item.effort} effort.`,
      module: item.module,
      impact: item.impact,
      effort: item.effort,
    }));

  const keywordOpportunities = [
    ...(audit.keywords?.primary ?? []).slice(0, 3).map((item) => `${item.keyword} (${item.intent}, ${item.priority} priority)`),
    ...(audit.keywords?.competitorGaps ?? []).slice(0, 2),
    ...(audit.keywords?.contentIdeas ?? []).slice(0, 2).map((item) => `${item.title} targeting ${item.targetKeyword}`),
  ].filter(Boolean);

  const backlinkOpportunities = [
    ...(audit.offPage?.backlinkStrategy.priorityActions ?? []).slice(0, 3),
    ...(audit.offPage?.backlinkStrategy.quickWins ?? []).slice(0, 2),
    ...(audit.offPage?.authorityTactics ?? []).slice(0, 2),
  ].filter(Boolean);

  const technicalFocus = [
    ...(audit.technical?.issues ?? []),
    ...(audit.technical?.schema.recommendations ?? []),
    audit.technical?.coreWebVitals.lcp.fix,
    audit.technical?.coreWebVitals.cls.fix,
    audit.technical?.coreWebVitals.fid.fix,
  ];

  const roadmap30Days = priorityActions.slice(0, 4).map((item, index) => {
    const week = Math.min(index + 1, 4);
    return `Week ${week}: ${item.title}`;
  });

  const executiveSummary =
    audit.summary?.trim() ||
    `${projectName} currently has an SEO health score of ${scorecard.overall}/100. The site has a solid base in some areas, but there are clear opportunities to improve technical performance, on-page clarity, and search visibility over the next 30 days.`;

  const performanceSummary = compactStrings([
    externalData?.searchConsole
      ? `Search Console shows ${formatMetricValue(externalData.searchConsole.totals.clicks)} clicks and ${formatMetricValue(
          externalData.searchConsole.totals.impressions
        )} impressions over the last ${externalData.searchConsole.periodDays} days.`
      : null,
    externalData?.ga4
      ? `GA4 shows ${formatMetricValue(externalData.ga4.totals.sessions)} sessions and ${formatMetricValue(
          externalData.ga4.totals.conversions
        )} conversions over the same window.`
      : null,
  ]).join(" ");

  const plainSummary = `${projectName} scored ${scorecard.overall}/100 overall. Primary focus areas are ${labelFromScore(scorecard.technical).toLowerCase()} technical SEO, ${labelFromScore(scorecard.onpage).toLowerCase()} on-page work, and ${labelFromScore(scorecard.keywords).toLowerCase()} keyword targeting.`;
  const clientSummary = previousScores
    ? `${projectName} is now at ${scorecard.overall}/100, which is ${
        scorecard.overall - previousScores.overall >= 0 ? "up" : "down"
      } ${Math.abs(scorecard.overall - previousScores.overall)} points from the previous audit.`
    : `${projectName} is currently at ${scorecard.overall}/100, with the strongest short-term gains expected from the priority fixes listed below.`;

  const scoreDeltas = [
    {
      label: "Overall",
      current: scorecard.overall,
      previous: previousScores?.overall ?? null,
      change: previousScores ? scorecard.overall - previousScores.overall : null,
    },
    {
      label: "Technical",
      current: scorecard.technical,
      previous: previousScores?.technical ?? null,
      change: previousScores ? scorecard.technical - previousScores.technical : null,
    },
    {
      label: "On-page",
      current: scorecard.onpage,
      previous: previousScores?.onpage ?? null,
      change: previousScores ? scorecard.onpage - previousScores.onpage : null,
    },
    {
      label: "Keywords",
      current: scorecard.keywords,
      previous: previousScores?.keywords ?? null,
      change: previousScores ? scorecard.keywords - previousScores.keywords : null,
    },
  ];

  const headlineMetrics: ReportMetric[] = [
    {
      label: "Overall health",
      value: `${scorecard.overall}/100`,
      tone: toneFromScore(scorecard.overall),
      note: `${labelFromScore(scorecard.overall)} overall SEO position`,
    },
    {
      label: "Technical SEO",
      value: `${scorecard.technical}/100`,
      tone: toneFromScore(scorecard.technical),
      note: "Crawlability, speed, schema, and mobile readiness",
    },
    {
      label: "On-page SEO",
      value: `${scorecard.onpage}/100`,
      tone: toneFromScore(scorecard.onpage),
      note: "Titles, content structure, and internal linking",
    },
    {
      label: "Search growth",
      value: `${scorecard.keywords}/100`,
      tone: toneFromScore(scorecard.keywords),
      note: "Keyword opportunity and content expansion room",
    },
    ...(externalData?.searchConsole
      ? [
          {
            label: "Search clicks",
            value: formatMetricValue(externalData.searchConsole.totals.clicks),
            tone:
              externalData.searchConsole.deltas.clicksPct === null
                ? "watch"
                : externalData.searchConsole.deltas.clicksPct >= 0
                  ? "strong"
                  : "critical",
            note: `Last ${externalData.searchConsole.periodDays} days • ${formatSignedPercent(
              externalData.searchConsole.deltas.clicksPct
            )} vs previous period`,
          } satisfies ReportMetric,
        ]
      : []),
    ...(externalData?.ga4
      ? [
          {
            label: "Sessions",
            value: formatMetricValue(externalData.ga4.totals.sessions),
            tone:
              externalData.ga4.deltas.sessionsPct === null
                ? "watch"
                : externalData.ga4.deltas.sessionsPct >= 0
                  ? "strong"
                  : "critical",
            note: `Last ${externalData.ga4.periodDays} days • ${formatSignedPercent(
              externalData.ga4.deltas.sessionsPct
            )} vs previous period`,
          } satisfies ReportMetric,
        ]
      : []),
  ];

  const emailSubject = `${clientName}: SEO report for ${projectName}`;
  const emailBody = [
    `Hi ${clientName},`,
    "",
    `Your latest SEO report for ${projectName} is ready.`,
    "",
    `Headline summary: ${plainSummary}${performanceSummary ? ` ${performanceSummary}` : ""}`,
    "",
    "Top wins:",
    ...firstItems(wins, 3, ["Strong foundation identified in the latest audit."]).map((item) => `- ${item}`),
    ...(externalData?.summaryLines?.length
      ? ["", "Performance snapshot:", ...externalData.summaryLines.slice(0, 3).map((item) => `- ${item}`)]
      : []),
    "",
    "Top priorities:",
    ...firstItems(priorityActions.map((item) => item.title), 3, ["Address the highest-impact technical and on-page fixes first."]).map((item) => `- ${item}`),
    "",
    "Next 30 days:",
    ...firstItems(roadmap30Days, 3, ["Focus on quick wins first, then move into scalable content and authority work."]).map((item) => `- ${item}`),
    "",
    "If you’d like, I can walk you through the recommended fixes and rollout order.",
    "",
    "Best,",
    "Your SEO Team",
  ].join("\n");

  return {
    version: 2,
    title: options.title?.trim() || `SEO Growth Report - ${projectName}`,
    type: "client-seo-report",
    status: options.status || (recipientEmail ? "ready_to_send" : "draft"),
    clientName,
    projectName,
    recipientEmail,
    domain,
    generatedAt: createdAt,
    generatedFromAuditId: audit.id,
    executiveSummary,
    plainSummary: `${plainSummary}${performanceSummary ? ` ${performanceSummary}` : ""}`,
    clientSummary,
    scorecard,
    headlineMetrics,
    scoreDeltas,
    keyWins: firstItems(wins, 5, ["The site has usable foundations to build on with a focused optimization sprint."]),
    keyRisks: firstItems(
      [
        ...risks,
        ...(externalData?.warnings || []),
        ...(externalData?.searchConsole &&
        externalData.searchConsole.deltas.clicksPct !== null &&
        externalData.searchConsole.deltas.clicksPct < 0
          ? [`Search Console clicks are down ${Math.abs(externalData.searchConsole.deltas.clicksPct)}% versus the previous period.`]
          : []),
        ...(externalData?.ga4 &&
        externalData.ga4.deltas.conversionsPct !== null &&
        externalData.ga4.deltas.conversionsPct < 0
          ? [`GA4 conversions are down ${Math.abs(externalData.ga4.deltas.conversionsPct)}% versus the previous period.`]
          : []),
      ],
      5,
      ["There are still unresolved high-impact items worth addressing in the next sprint."]
    ),
    priorityActions:
      priorityActions.length > 0
        ? priorityActions
        : [
            {
              title: "Review audit details and confirm the first implementation sprint",
              detail: "The audit completed, but there were not enough structured action items to build a fuller client plan automatically.",
              module: "technical",
              impact: "medium",
              effort: "medium",
            },
          ],
    roadmap30Days: firstItems(
      roadmap30Days,
      4,
      ["Week 1: Finalize priorities", "Week 2: Ship top technical fixes", "Week 3: Improve priority pages", "Week 4: Expand content opportunities"]
    ),
    keywordOpportunities: firstItems(
      keywordOpportunities,
      6,
      ["Identify one commercial intent keyword cluster and one informational cluster for the next content sprint."]
    ),
    backlinkOpportunities: firstItems(
      backlinkOpportunities,
      6,
      ["Start with the fastest authority wins before moving into broader link outreach."]
    ),
    technicalFocus: firstItems(
      compactStrings(technicalFocus),
      5,
      ["Improve crawlability, structured data, and page speed to strengthen the technical base."]
    ),
    highlights: firstItems(
      compactStrings([
        clientSummary,
        ...(externalData?.summaryLines || []).slice(0, 2),
        wins[0],
        risks[0],
        roadmap30Days[0],
      ]),
      4,
      [clientSummary]
    ),
    externalData,
    charts: [
      ...scoreDeltas.map((item) => ({
        label: item.label,
        current: item.current,
        previous: item.previous,
      })),
      ...(externalData?.searchConsole
        ? [
            {
              label: "Search Clicks",
              current: externalData.searchConsole.totals.clicks,
              previous: externalData.searchConsole.previousTotals.clicks,
            },
          ]
        : []),
      ...(externalData?.ga4
        ? [
            {
              label: "Sessions",
              current: externalData.ga4.totals.sessions,
              previous: externalData.ga4.previousTotals.sessions,
            },
            {
              label: "Conversions",
              current: externalData.ga4.totals.conversions,
              previous: externalData.ga4.previousTotals.conversions,
            },
          ]
        : []),
    ],
    branding: {
      accent: options.branding?.accent || "#00C896",
      agencyLabel: options.branding?.agencyLabel || "Your SEO Team",
      footerNote:
        options.branding?.footerNote ||
        "Prepared for client review. Priorities are ordered to create measurable SEO gains over the next 30 days.",
    },
    delivery: {
      lastUpdatedAt: new Date().toISOString(),
      sentAt: options.sentAt || null,
    },
    emailSubject,
    emailBody,
  };
}

export function parseReportContent(value: string | null | undefined): ReportDocument | null {
  if (!value) {
    return null;
  }

  const parsed = safeJsonParse<Partial<ReportDocument> | null>(value, null);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  if (parsed.version === 2 && parsed.title && parsed.type) {
    return {
      version: 2,
      title: parsed.title,
      type: parsed.type,
      status: parsed.status === "sent" || parsed.status === "ready_to_send" ? parsed.status : "draft",
      clientName: parsed.clientName || "Your Client",
      projectName: parsed.projectName || "SEO Project",
      recipientEmail: parsed.recipientEmail || "",
      domain: parsed.domain || "",
      generatedAt: parsed.generatedAt || new Date().toISOString(),
      generatedFromAuditId: parsed.generatedFromAuditId || null,
      executiveSummary: parsed.executiveSummary || "",
      plainSummary: parsed.plainSummary || "",
      clientSummary: parsed.clientSummary || parsed.plainSummary || "",
      scorecard: parsed.scorecard || EMPTY_SCORES,
      headlineMetrics: Array.isArray(parsed.headlineMetrics) ? parsed.headlineMetrics : [],
      scoreDeltas: Array.isArray(parsed.scoreDeltas) ? parsed.scoreDeltas : [],
      keyWins: Array.isArray(parsed.keyWins) ? parsed.keyWins : [],
      keyRisks: Array.isArray(parsed.keyRisks) ? parsed.keyRisks : [],
      priorityActions: Array.isArray(parsed.priorityActions) ? parsed.priorityActions : [],
      roadmap30Days: Array.isArray(parsed.roadmap30Days) ? parsed.roadmap30Days : [],
      keywordOpportunities: Array.isArray(parsed.keywordOpportunities) ? parsed.keywordOpportunities : [],
      backlinkOpportunities: Array.isArray(parsed.backlinkOpportunities) ? parsed.backlinkOpportunities : [],
      technicalFocus: Array.isArray(parsed.technicalFocus) ? parsed.technicalFocus : [],
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      externalData:
        parsed.externalData && typeof parsed.externalData === "object"
          ? (parsed.externalData as ExternalDataSnapshot)
          : null,
      charts: Array.isArray(parsed.charts) ? parsed.charts : [],
      branding: {
        accent: parsed.branding?.accent || "#00C896",
        agencyLabel: parsed.branding?.agencyLabel || "Your SEO Team",
        footerNote:
          parsed.branding?.footerNote ||
          "Prepared for client review. Priorities are ordered to create measurable SEO gains over the next 30 days.",
      },
      delivery: {
        lastUpdatedAt: parsed.delivery?.lastUpdatedAt || parsed.generatedAt || new Date().toISOString(),
        sentAt: parsed.delivery?.sentAt || null,
      },
      emailSubject: parsed.emailSubject || "",
      emailBody: parsed.emailBody || "",
    };
  }

  return null;
}

export function reportDocumentToHtml(document: ReportDocument) {
  const sectionList = (items: string[]) =>
    items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const actionList = document.priorityActions
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.title)}</strong><br /><span>${escapeHtml(item.detail)}</span></li>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(document.title)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; margin: 40px; line-height: 1.6; }
      h1, h2, h3 { color: #0f172a; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 24px 0; }
      .metric { border: 1px solid #d1d5db; border-radius: 12px; padding: 16px; background: #f8fafc; }
      .muted { color: #475569; }
      ul { padding-left: 20px; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(document.title)}</h1>
    <p class="muted">${escapeHtml(document.projectName)} • ${escapeHtml(document.domain)} • Generated ${escapeHtml(
    new Date(document.generatedAt).toLocaleString()
  )}</p>
    <p>${escapeHtml(document.executiveSummary)}</p>
    <p class="muted">${escapeHtml(document.clientSummary)}</p>
    <div class="grid">
      ${document.headlineMetrics
        .map(
          (metric) => `<div class="metric"><strong>${escapeHtml(metric.label)}</strong><div>${escapeHtml(metric.value)}</div><p class="muted">${escapeHtml(metric.note)}</p></div>`
        )
        .join("")}
    </div>
    <h2>Key Wins</h2>
    <ul>${sectionList(document.keyWins)}</ul>
    <h2>Key Risks</h2>
    <ul>${sectionList(document.keyRisks)}</ul>
    <h2>Priority Actions</h2>
    <ul>${actionList}</ul>
    <h2>30-Day Roadmap</h2>
    <ul>${sectionList(document.roadmap30Days)}</ul>
    <h2>Keyword Opportunities</h2>
    <ul>${sectionList(document.keywordOpportunities)}</ul>
    <h2>Backlink Opportunities</h2>
    <ul>${sectionList(document.backlinkOpportunities)}</ul>
    <h2>Technical Focus</h2>
    <ul>${sectionList(document.technicalFocus)}</ul>
    <p class="muted">${escapeHtml(document.branding.footerNote)}</p>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
