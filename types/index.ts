/* ═══════════════════════════════════════════
   TechGeekStudio SEO Command Center — Types
   ═══════════════════════════════════════════ */

// ──── Scraper Types ────

export interface ScrapedData {
  url: string;
  statusCode: number;
  loadTime: number;
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  metaKeywords: string | null;
  canonical: string | null;
  robots: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
  h1Count: number;
  h2Count: number;
  wordCount: number;
  visibleText: string;
  totalImages: number;
  imagesWithoutAlt: number;
  imagesWithAlt: number;
  totalLinks: number;
  internalLinks: number;
  externalLinks: number;
  externalLinkUrls: string[];
  brokenLinksCount: number;
  schemaTypes: string[];
  hasSchema: boolean;
  schemaRaw: string[];
  hasViewport: boolean;
  hasHttps: boolean;
  htmlSize: number;
  twitterCard: string | null;
}

// ──── PageSpeed Types ────

export interface CoreWebVital {
  value: string;
  score: number;
  status: "good" | "needs_improvement" | "poor";
}

export interface PageSpeedOpportunity {
  title: string;
  description: string;
  savings: string;
}

export interface PageSpeedDiagnostic {
  title: string;
  description: string;
}

export interface PageSpeedResult {
  strategy: "mobile" | "desktop";
  performanceScore: number;
  lcp: CoreWebVital;
  fid: CoreWebVital;
  cls: CoreWebVital;
  fcp: CoreWebVital;
  ttfb: CoreWebVital;
  speedIndex: CoreWebVital;
  opportunities: PageSpeedOpportunity[];
  diagnostics: PageSpeedDiagnostic[];
}

export interface PageSpeedData {
  mobile: PageSpeedResult;
  desktop: PageSpeedResult;
}

// ──── Audit Types ────

export interface AuditScores {
  overall: number;
  onpage: number;
  technical: number;
  offpage: number;
  keywords: number;
}

export interface TitleTagAnalysis {
  current: string;
  length: number;
  status: "good" | "too_long" | "too_short" | "missing";
  score: number;
  recommendation: string;
}

export interface MetaDescriptionAnalysis {
  current: string;
  length: number;
  status: "good" | "too_long" | "too_short" | "missing";
  score: number;
  recommendation: string;
}

export interface HeadingsAnalysis {
  h1Count: number;
  h1Text: string[];
  status: "good" | "multiple_h1" | "missing_h1";
  score: number;
  recommendation: string;
}

export interface ContentAnalysisDetail {
  wordCount: number;
  readabilityScore: number;
  keywordDensity: string;
  contentGaps: string[];
  lsiKeywordsMissing: string[];
  recommendation: string;
}

export interface ImagesAnalysis {
  total: number;
  missingAlt: number;
  score: number;
  recommendation: string;
}

export interface InternalLinkingAnalysis {
  totalLinks: number;
  internalCount: number;
  externalCount: number;
  score: number;
  opportunities: string[];
}

export interface OnPageAnalysis {
  titleTag: TitleTagAnalysis;
  metaDescription: MetaDescriptionAnalysis;
  headings: HeadingsAnalysis;
  content: ContentAnalysisDetail;
  images: ImagesAnalysis;
  internalLinking: InternalLinkingAnalysis;
  issues: string[];
  wins: string[];
}

export interface CWVMetric {
  value: string;
  status: "good" | "needs_improvement" | "poor";
  fix: string;
}

export interface CrawlabilityAnalysis {
  hasCanonical: boolean;
  robotsMeta: string;
  hasHttps: boolean;
  htmlSize: string;
  score: number;
  issues: string[];
}

export interface SchemaAnalysis {
  detected: string[];
  missing: string[];
  priority: "high" | "medium" | "low";
  recommendations: string[];
}

export interface MobileAnalysis {
  hasViewport: boolean;
  score: number;
  issues: string[];
}

export interface TechnicalAnalysis {
  coreWebVitals: {
    lcp: CWVMetric;
    fid: CWVMetric;
    cls: CWVMetric;
    performanceScore: { mobile: number; desktop: number };
  };
  crawlability: CrawlabilityAnalysis;
  schema: SchemaAnalysis;
  mobile: MobileAnalysis;
  issues: string[];
  wins: string[];
}

export interface LinkTarget {
  type: "guest_post" | "niche_edit" | "resource" | "partnership";
  target: string;
  dr: string;
  priority: "high" | "medium" | "low";
}

export interface OffPageAnalysis {
  backlinkStrategy: {
    priorityActions: string[];
    quickWins: string[];
    linkTargets: LinkTarget[];
  };
  digitalPR: {
    angles: string[];
    targetPublications: string[];
  };
  anchorTextStrategy: {
    branded: string;
    partialMatch: string;
    exactMatch: string;
    naked: string;
    generic: string;
  };
  authorityTactics: string[];
}

export interface KeywordItem {
  keyword: string;
  intent: "commercial" | "informational" | "transactional" | "navigational";
  volume: "high" | "medium" | "low";
  difficulty: "high" | "medium" | "low";
  priority: "high" | "medium" | "low";
}

export interface LongTailKeyword {
  keyword: string;
  intent: string;
  volume: string;
  opportunity: "high" | "medium" | "low";
}

export interface ContentIdea {
  title: string;
  targetKeyword: string;
  wordCount: number;
  priority: "high" | "medium" | "low";
}

export interface KeywordsAnalysis {
  primary: KeywordItem[];
  longTail: LongTailKeyword[];
  lsi: string[];
  competitorGaps: string[];
  contentIdeas: ContentIdea[];
}

export interface ChecklistItem {
  action: string;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  module: "onpage" | "technical" | "offpage" | "keywords";
}

export interface AuditChecklist {
  critical: ChecklistItem[];
  high: ChecklistItem[];
  medium: ChecklistItem[];
  longTerm: ChecklistItem[];
}

export interface FullAuditResult {
  scores: AuditScores;
  summary: string;
  onPage: OnPageAnalysis;
  technical: TechnicalAnalysis;
  offPage: OffPageAnalysis;
  keywords: KeywordsAnalysis;
  checklist: AuditChecklist;
}

// ──── Keyword Research Types ────

export interface KeywordResearchInput {
  seedKeyword: string;
  targetCountry: string;
  industry: string;
  targetAudience: string;
  competitorDomains?: string;
}

export interface KeywordResearchResult {
  primary: KeywordItem[];
  longTail: LongTailKeyword[];
  lsi: string[];
  competitorGaps: string[];
  contentIdeas: ContentIdea[];
  topicCluster: {
    pillar: string;
    supporting: string[];
  };
  intentAnalysis: string;
}

// ──── Backlink Types ────

export interface BacklinkStrategyInput {
  targetUrl: string;
  industry: string;
  targetCountry: string;
  currentDR: number;
}

export interface DomainQualification {
  domain: string;
  nicheRelevance: number;
  qualityTier: "Tier 1" | "Tier 2" | "Tier 3";
  recommendedAngle: string;
  redFlags: string[];
  priority: number;
}

// ──── Outreach Types ────

export interface OutreachInput {
  targetUrl: string;
  targetName: string;
  targetEmail: string;
  angle: "guest_post" | "niche_edit" | "resource_link" | "partnership" | "digital_pr";
  contentAngle: string;
  companyInfo?: {
    name: string;
    website: string;
    description: string;
  };
}

export interface OutreachEmailSequence {
  subject: string;
  subjectAlt: string;
  body: string;
  followUp1: string;
  followUp2: string;
  breakup: string;
  linkedInMessage: string;
}

// ──── Authority Types ────

export interface AuthorityRoadmapInput {
  currentDR: number;
  monthlyTraffic: number;
  revenueGoal: string;
  teamSize: number;
}

export interface QuarterMilestone {
  quarter: string;
  drTarget: number;
  referringDomains: number;
  trafficTarget: number;
  leadsTarget: number;
  tactics: string[];
  resources: string[];
}

export interface AuthorityRoadmap {
  milestones: QuarterMilestone[];
  summary: string;
}

// ──── Chat Types ────

export interface ChatMessageType {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface ChatSessionType {
  id: string;
  title: string;
  messages: ChatMessageType[];
  createdAt: Date;
  updatedAt: Date;
}

// ──── Content Analysis Types ────

export interface ContentAnalysisResult {
  titleOptimizer: {
    current: string;
    alternatives: Array<{ title: string; charCount: number }>;
  };
  metaOptimizer: {
    current: string;
    alternatives: Array<{ description: string; charCount: number }>;
  };
  headingStructure: {
    hierarchy: Array<{ level: number; text: string }>;
    score: number;
    issues: string[];
  };
  contentScore: {
    overall: number;
    depth: number;
    keywords: number;
    readability: number;
    structure: number;
  };
  lsiKeywords: Array<{ keyword: string; placement: string }>;
  internalLinkOpportunities: Array<{ page: string; anchorText: string; reason: string }>;
  eeatScore: {
    score: number;
    improvements: string[];
  };
}

export interface MetaTagResult {
  titles: Array<{ text: string; charCount: number; keywordPosition: string }>;
  descriptions: Array<{ text: string; charCount: number }>;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
}

export interface SchemaGeneratorResult {
  type: string;
  jsonLd: string;
}

// ──── Technical SEO Types ────

export interface TechnicalSEOResult {
  coreWebVitals: {
    lcp: CWVMetric;
    cls: CWVMetric;
    fid: CWVMetric;
    score: number;
  };
  crawlability: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
  schema: {
    detected: string[];
    missing: string[];
    score: number;
    recommendations: string[];
  };
  pageSpeed: {
    mobileScore: number;
    desktopScore: number;
    opportunities: string[];
  };
  mobile: {
    score: number;
    issues: string[];
  };
  security: {
    hasHttps: boolean;
    score: number;
    issues: string[];
  };
  htmlQuality: {
    score: number;
    issues: string[];
  };
  internationalSeo: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
}

// ──── Report Types ────

export interface ReportListItem {
  id: string;
  title: string;
  type: string;
  createdAt: Date;
  auditId: string | null;
}

// ──── API Response Types ────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ──── SSE Audit Progress ────

export interface AuditProgressStep {
  step: number;
  message: string;
  status: "pending" | "running" | "done" | "error";
}

// ──── Bulk Analyzer Types ────

export interface BulkUrlResult {
  url: string;
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  h1Count: number;
  wordCount: number;
  score: number;
  issues: string[];
}
