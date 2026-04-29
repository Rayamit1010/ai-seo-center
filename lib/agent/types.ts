export type ProspectStage =
  | "discovered"
  | "qualifying"
  | "qualified"
  | "finding_contact"
  | "contact_found"
  | "drafting_email"
  | "email_drafted"
  | "sending"
  | "email_sent"
  | "follow_up_1"
  | "follow_up_2"
  | "breakup_sent"
  | "completed"
  | "replied"
  | "rejected"
  | "failed";

export type DiscoveryMethod =
  | "competitor_analysis"
  | "guest_post_search"
  | "resource_page"
  | "broken_link";

export type OutreachAngle =
  | "guest_post"
  | "niche_edit"
  | "resource_link"
  | "partnership";

export type EmailType = "initial" | "follow_up_1" | "follow_up_2" | "breakup";

export interface PipelineConfig {
  dailyDiscoverLimit: number;
  dailyEmailLimit: number;
  minQualityScore: number;
  minRelevanceScore: number;
  followUpDays: [number, number, number];
  preferredAngles: OutreachAngle[];
  blockedDomains: string[];
}

export interface AgentLogEntry {
  timestamp: string;
  stage: string;
  action: string;
  prospectDomain?: string;
  success: boolean;
  detail?: string;
  durationMs?: number;
}

export interface AgentHeartbeatStatus {
  isRunning: boolean;
  lastRun: string | null;
  nextRun: string | null;
  cycleIntervalMinutes: number;
  pending: {
    discover: number;
    qualify: number;
    contact: number;
    draft: number;
    send: number;
  };
  todayStats: {
    emailsSent: number;
    dailyLimit: number;
    prospectsDiscovered: number;
    prospectsQualified: number;
  };
}

export interface DiscoveryResult {
  prospects: Array<{
    domain: string;
    url: string;
    discoveryMethod: DiscoveryMethod;
    suggestedAngle: OutreachAngle;
    reasoning: string;
  }>;
}

export interface QualificationResult {
  qualityScore: number;
  qualityTier: "tier1" | "tier2" | "tier3" | "rejected";
  relevanceScore: number;
  reasoning: string;
  redFlags: string[];
  recommendedAngle: OutreachAngle;
  spamRisk: number;
  authorityScore: number;
  topicalFit: number;
  editorialQuality: number;
  linkWorthiness: number;
  outreachReadiness: "ready" | "needs_review" | "avoid";
  positiveSignals: string[];
}

export interface ContactScrapeResult {
  emails: Array<{
    email: string;
    name?: string;
    role?: string;
    source: string;
    confidence: "high" | "medium" | "low";
  }>;
  pagesScraped: string[];
}

export interface DraftedEmail {
  subject: string;
  body: string;
  followUp1: { subject: string; body: string; delayDays: number };
  followUp2: { subject: string; body: string; delayDays: number };
  breakup: { subject: string; body: string; delayDays: number };
}

export interface PipelineStats {
  stages: Record<string, number>;
  campaigns: number;
  totalProspects: number;
  totalSent: number;
  totalReplied: number;
  totalLinks: number;
  highQualityProspects: number;
  averageQualityScore: number;
  lowRiskProspects: number;
  linksThisMonth: number;
  replyRate: number;
  conversionRate: number;
  emailsSentToday: number;
  dailyLimit: number;
  topCampaigns?: Array<{
    id: string;
    name: string;
    totalProspects: number;
    totalLinks: number;
    totalSent: number;
    totalReplied: number;
  }>;
  aiHealth?: {
    providerOrder: string[];
    totals: {
      attempts: number;
      failovers: number;
      configuredProviders: number;
      healthyProviders: number;
    };
    providers: Array<{
      id: string;
      name: string;
      configured: boolean;
      successRate: number;
      averageLatencyMs: number | null;
      lastLatencyMs: number | null;
      attempts: number;
      successes: number;
      failures: number;
      consecutiveFailures: number;
      failovers: number;
      lastError: string | null;
      cooldownUntil: string | null;
      lastUsedAt: string | null;
      lastSuccessAt: string | null;
      lastFailureAt: string | null;
      healthScore: number;
      tasks: Record<string, number>;
      recommended: boolean;
    }>;
  };
}

export interface AgentCycleResult {
  skipped?: boolean;
  reason?: string;
  processed?: number;
  log?: AgentLogEntry[];
}
